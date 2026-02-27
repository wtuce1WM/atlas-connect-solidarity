import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Save, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Synonymes de recherche</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <button className="rounded-full text-muted-foreground hover:text-foreground transition-colors" title="Comprendre les synonymes">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-4 text-sm space-y-3" align="start">
                <h4 className="font-semibold">Synonymes vs Mots-clés : quelle différence ?</h4>

                <div className="space-y-2">
                  <div>
                    <span className="font-medium">🔍 Synonymes de recherche</span>
                    <span className="text-muted-foreground"> (cette page)</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Agissent côté <strong>requête</strong> (tsquery). Quand l'utilisateur tape un mot, ses synonymes sont ajoutés automatiquement à la recherche via OR.
                      <br />Ex : <code className="bg-muted px-1 rounded">riad</code> → cherche aussi <code className="bg-muted px-1 rounded">maison d'hôtes</code>, <code className="bg-muted px-1 rounded">guesthouse</code>.
                    </p>
                  </div>

                  <div>
                    <span className="font-medium">📦 Mots-clés de sous-catégories</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Indexés dans le <code className="bg-muted px-1 rounded">search_vector</code> de chaque établissement (Poids A — fort). Permettent à une sous-catégorie d'être trouvée par des termes alternatifs.
                      <br />Ex : sous-catégorie « Riad » avec keywords <code className="bg-muted px-1 rounded">dar, maison d'hôtes</code>.
                    </p>
                  </div>

                  <div>
                    <span className="font-medium">🏷️ Mots-clés de services</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Indexés dans le <code className="bg-muted px-1 rounded">search_vector</code> (Poids B — moyen). Permettent à un service d'être trouvé par des variantes.
                      <br />Ex : service « Piscine » avec keywords <code className="bg-muted px-1 rounded">pool, bassin, baignade</code>.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-2 text-xs text-muted-foreground">
                  <strong>En résumé :</strong> les synonymes élargissent <em>ce qu'on cherche</em>, les mots-clés élargissent <em>ce qu'on trouve</em>.
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-muted-foreground">
            Chaque mot-clé est étendu avec ses synonymes dans les requêtes tsquery.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Mot-clé" className="max-w-[150px]" />
            <Input value={newSynonyms} onChange={e => setNewSynonyms(e.target.value)} placeholder="Synonymes (séparés par virgule)" className="flex-1" />
            <Button size="sm" onClick={addEntry} className="bg-amber-600 hover:bg-amber-700 text-white"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Voulez-vous vraiment supprimer le groupe de synonymes « {entry.key_word} » ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteEntry(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entry.synonyms.map(syn => (
                <Badge key={syn} variant="outline" className="gap-1 group">
                  {syn}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Retirer le synonyme « {syn} » de « {entry.key_word} » ?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Non</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeSynonymFromEntry(entry.id, syn)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
              <Button size="sm" variant="outline" onClick={() => addSynonymToEntry(entry.id)} className="border-amber-600 text-amber-700 hover:bg-amber-50">
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
