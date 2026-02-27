import { useState, useEffect } from "react";
import { Loader2, Save, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Subcategory {
  id: string;
  name_fr: string;
  merge_group: string | null;
}

const SubcategoryMergesManagement = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubcat, setSelectedSubcat] = useState<string>("");
  const [groupName, setGroupName] = useState("");

  const load = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("subcategories")
      .select("id, name_fr, merge_group")
      .order("name_fr");
    if (data) setSubcategories(data as Subcategory[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const groups = subcategories
    .filter(s => s.merge_group)
    .reduce((acc, s) => {
      if (!acc[s.merge_group!]) acc[s.merge_group!] = [];
      acc[s.merge_group!].push(s);
      return acc;
    }, {} as Record<string, Subcategory[]>);

  const assignGroup = async () => {
    if (!selectedSubcat || !groupName.trim()) return;
    const { error } = await supabase
      .from("subcategories")
      .update({ merge_group: groupName.trim().toLowerCase() })
      .eq("id", selectedSubcat);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Groupe assigné" });
      setSelectedSubcat("");
      load();
    }
  };

  const removeFromGroup = async (id: string) => {
    await supabase.from("subcategories").update({ merge_group: null }).eq("id", id);
    load();
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fusion de sous-catégories en recherche</CardTitle>
          <p className="text-sm text-muted-foreground">
            Les sous-catégories du même groupe sont fusionnées dans les résultats (ex: Hôtel + Riad).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedSubcat} onValueChange={setSelectedSubcat}>
              <SelectTrigger className="max-w-[250px]">
                <SelectValue placeholder="Sous-catégorie..." />
              </SelectTrigger>
              <SelectContent>
                {subcategories.filter(s => !s.merge_group).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name_fr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Nom du groupe (ex: hebergement)"
              className="max-w-[200px]"
            />
            <Button size="sm" onClick={assignGroup}>
              <Link2 className="h-4 w-4 mr-1" />Assigner
            </Button>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groups).map(([group, subcats]) => (
        <Card key={group}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="font-mono">{group}</Badge>
              <span className="text-xs text-muted-foreground">{subcats.length} sous-catégorie(s) fusionnées</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {subcats.map(s => (
                <Badge key={s.id} variant="outline" className="gap-1.5 group py-1">
                  {s.name_fr}
                  <button onClick={() => removeFromGroup(s.id)} className="opacity-0 group-hover:opacity-100">
                    <Unlink className="h-3 w-3 text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(groups).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun groupe de fusion configuré.</p>
      )}
    </div>
  );
};

export default SubcategoryMergesManagement;
