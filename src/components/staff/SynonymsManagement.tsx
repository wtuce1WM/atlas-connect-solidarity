import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SynonymEntry {
  id: string;
  key_word: string;
  synonyms: string[];
  is_active: boolean;
}

const SynonymsManagement = () => {
  const [entries, setEntries] = useState<SynonymEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newSynonyms, setNewSynonyms] = useState("");
  const [editingSynonym, setEditingSynonym] = useState<Record<string, string>>({});

  const load = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("search_synonyms")
      .select("*")
      .order("key_word");
    if (data) setEntries(data as SynonymEntry[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addEntry = async () => {
    const key = newKey.trim().toLowerCase();
    const syns = newSynonyms.split(",").map(s => s.trim()).filter(Boolean);
    if (!key || syns.length === 0) return;
    const { error } = await supabase.from("search_synonyms").insert({ key_word: key, synonyms: syns });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewKey("");
      setNewSynonyms("");
      load();
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("search_synonyms").update({ is_active }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_active } : e));
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("search_synonyms").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const addSynonymToEntry = async (id: string) => {
    const syn = (editingSynonym[id] || "").trim();
    if (!syn) return;
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = [...entry.synonyms, syn];
    await supabase.from("search_synonyms").update({ synonyms: updated }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, synonyms: updated } : e));
    setEditingSynonym(prev => ({ ...prev, [id]: "" }));
  };

  const removeSynonymFromEntry = async (id: string, syn: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = entry.synonyms.filter(s => s !== syn);
    await supabase.from("search_synonyms").update({ synonyms: updated }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, synonyms: updated } : e));
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synonymes de recherche</CardTitle>
          <p className="text-sm text-muted-foreground">
            Chaque mot-clé est étendu avec ses synonymes dans les requêtes tsquery.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Mot-clé" className="max-w-[150px]" />
            <Input value={newSynonyms} onChange={e => setNewSynonyms(e.target.value)} placeholder="Synonymes (séparés par virgule)" className="flex-1" />
            <Button size="sm" onClick={addEntry}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
          </div>
        </CardContent>
      </Card>

      {entries.map(entry => (
        <Card key={entry.id} className={entry.is_active ? "" : "opacity-50"}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={entry.is_active} onCheckedChange={v => toggleActive(entry.id, v)} />
                <code className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">{entry.key_word}</code>
                <span className="text-xs text-muted-foreground">→ {entry.synonyms.length} synonyme(s)</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entry.synonyms.map(syn => (
                <Badge key={syn} variant="outline" className="gap-1 group">
                  {syn}
                  <button onClick={() => removeSynonymFromEntry(entry.id, syn)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={editingSynonym[entry.id] || ""}
                onChange={e => setEditingSynonym(prev => ({ ...prev, [entry.id]: e.target.value }))}
                placeholder="Ajouter un synonyme..."
                className="max-w-xs text-sm"
                onKeyDown={e => e.key === "Enter" && addSynonymToEntry(entry.id)}
              />
              <Button size="sm" variant="outline" onClick={() => addSynonymToEntry(entry.id)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">{entries.filter(e => e.is_active).length} groupes actifs sur {entries.length}</p>
    </div>
  );
};

export default SynonymsManagement;
