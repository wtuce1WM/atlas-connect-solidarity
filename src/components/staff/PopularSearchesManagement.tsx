import { useState, useEffect, useCallback } from "react";
import { Plus, X, Loader2, ExternalLink, GripVertical, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PopularSearch {
  id: string;
  query: string;
  is_active: boolean;
  sort_order: number;
  extracted_keywords: string | null;
  created_at: string;
}

const PopularSearchesManagement = () => {
  const [items, setItems] = useState<PopularSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newQuery, setNewQuery] = useState("");

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("popular_searches")
      .select("*")
      .order("sort_order")
      .order("query");
    if (data) setItems(data as PopularSearch[]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const extractKeywords = useCallback(async (text: string): Promise<string | null> => {
    // Only extract if the query looks like natural language (5+ words, 2+ stop words)
    const STOP = new Set(["je","tu","il","elle","nous","vous","un","une","des","le","la","les","du","de","d","à","au","aux","en","pour","par","avec","sans","sur","dans","qui","que","où","comment","est","sont","cherche","veux","trouve","me","te","se","ce","cette","ne","pas","plus","très","aussi","bien","comme","mais","ou","et"]);
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 5 || words.filter(w => STOP.has(w)).length < 2) return null;
    try {
      const { data, error } = await supabase.functions.invoke("voice-search-intent", {
        body: { transcript: text },
      });
      if (error || !data?.keywords) return null;
      return data.keywords !== text ? data.keywords : null;
    } catch { return null; }
  }, []);

  const addItem = useCallback(async () => {
    const text = newQuery.trim();
    if (!text) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) : 0;
    
    // Auto-extract keywords for NL queries
    const keywords = await extractKeywords(text);
    
    const { data, error } = await supabase
      .from("popular_searches")
      .insert({ query: text, sort_order: maxOrder + 1, extracted_keywords: keywords })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setItems(prev => [...prev, data as PopularSearch]);
    setNewQuery("");
    toast({ title: keywords ? `Suggestion ajoutée (mots-clés: ${keywords})` : "Suggestion ajoutée" });
  }, [newQuery, items, extractKeywords]);

  const toggleActive = useCallback(async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from("popular_searches")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_active } : i));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("popular_searches").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: "Suggestion supprimée" });
  }, []);

  const getSearchUrl = (query: string) => `/search?q=${encodeURIComponent(query)}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = items.filter(i => i.is_active).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {items.length} suggestion{items.length > 1 ? "s" : ""}
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {activeCount} active{activeCount > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Add new */}
      <Card>
        <CardContent className="p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">
              Nouvelle suggestion de recherche
            </label>
            <Input
              placeholder="Ex: riad marrakech"
              value={newQuery}
              onChange={e => setNewQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem()}
            />
          </div>
          <Button
            onClick={addItem}
            disabled={!newQuery.trim()}
            className="h-9 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucune suggestion configurée.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(item => (
            <Card key={item.id} className={!item.is_active ? "opacity-50" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                <Switch
                  checked={item.is_active}
                  onCheckedChange={checked => toggleActive(item.id, checked)}
                  className="shrink-0"
                />
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 font-medium">{item.query}</span>
                <a
                  href={getSearchUrl(item.query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-amber-600 transition-colors shrink-0"
                  title="Voir les résultats"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer "{item.query}" ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Non</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteItem(item.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Oui
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PopularSearchesManagement;
