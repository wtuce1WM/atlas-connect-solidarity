import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Loader2, ArrowRight, Merge, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface IntentWord {
  id: string;
  word: string;
  word_en: string | null;
  word_ar: string | null;
  category_name: string;
  merge_on_conflict: boolean;
}


interface Category {
  id: string;
  name_fr: string;
}

const IntentManagement = () => {
  const [intents, setIntents] = useState<IntentWord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [intentRes, catRes] = await Promise.all([
        supabase.from("search_intent_words").select("*").order("category_name").order("word"),
        supabase.from("categories").select("id, name_fr").order("name_fr"),
      ]);
      if (intentRes.data) setIntents(intentRes.data as IntentWord[]);
      if (catRes.data) setCategories(catRes.data);
      setIsLoading(false);
    };
    load();
  }, []);

  const addIntent = useCallback(async () => {
    const word = newWord.trim().toLowerCase();
    if (!word || !newCategory) return;
    // Allow same word with different category (multi-category support)
    if (intents.some((i) => i.word === word && i.category_name === newCategory)) {
      toast({ title: "Erreur", description: `Le mot "${word}" → ${newCategory} existe déjà.`, variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase
        .from("search_intent_words")
        .insert({ word, category_name: newCategory, merge_on_conflict: true })
        .select()
        .single();
      if (error) throw error;
      setIntents((prev) => [...prev, data as IntentWord]);
      setNewWord("");
      toast({ title: "Ajouté", description: `"${word}" → ${newCategory}` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, [newWord, newCategory, intents]);

  const updateIntent = useCallback(async (id: string, updates: Partial<IntentWord>) => {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from("search_intent_words")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      setIntents((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
      toast({ title: "Mis à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }, []);

  const deleteIntent = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("search_intent_words").delete().eq("id", id);
      if (error) throw error;
      setIntents((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Supprimé" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, []);

  // Group intents by category
  const grouped = intents.reduce<Record<string, IntentWord[]>>((acc, i) => {
    if (filterCategory !== "all" && i.category_name !== filterCategory) return acc;
    (acc[i.category_name] = acc[i.category_name] || []).push(i);
    return acc;
  }, {});

  const categoryNames = [...new Set(intents.map((i) => i.category_name))].sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {intents.length} mot{intents.length > 1 ? "s" : ""} d'intention
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {categoryNames.length} catégorie{categoryNames.length > 1 ? "s" : ""} ciblée{categoryNames.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Add new */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground font-medium mb-1 block">
                Mot d'intention
              </label>
              <Input
                placeholder="Ex: manger, acheter, dormir…"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addIntent()}
                className="h-9"
              />
            </div>
            <div className="min-w-[200px]">
              <label className="text-xs text-muted-foreground font-medium mb-1 block">
                Catégorie cible
              </label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name_fr}>
                      {cat.name_fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addIntent} disabled={!newWord.trim() || !newCategory} className="h-9 bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Select value={filterCategory} onValueChange={setFilterCategory}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Filtrer par catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les catégories</SelectItem>
          {categoryNames.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat} ({intents.filter((i) => i.category_name === cat).length})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Grouped list */}
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b, "fr"))
        .map(([catName, words]) => (
          <Card key={catName}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-amber-600" />
                {catName}
                <Badge variant="outline" className="text-[10px] ml-1">
                  {words.length} mot{words.length > 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {words.map((intent) => (
                  <div
                    key={intent.id}
                    className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border"
                  >
                    <span className="text-sm font-medium">{intent.word}</span>
                    <div className="flex items-center gap-1 ml-1">
                      <Merge className="h-3 w-3 text-muted-foreground" />
                      <Switch
                        checked={intent.merge_on_conflict}
                        onCheckedChange={(checked) =>
                          updateIntent(intent.id, { merge_on_conflict: checked })
                        }
                        className="scale-75"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {intent.merge_on_conflict ? "Fusion" : "Strict"}
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Voulez-vous vraiment supprimer le mot d'intention « {intent.word} » ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Non</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteIntent(intent.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

      {Object.keys(grouped).length === 0 && (
        <p className="text-center text-muted-foreground py-8">Aucun mot d'intention trouvé.</p>
      )}

      {/* Documentation */}
      <Card className="bg-muted/40 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Comment fonctionne le mapping Intent → Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong>1. Détection</strong> — Quand l'utilisateur écrit "je veux <em>manger</em> du poisson", le moteur détecte le mot d'intention "manger" et l'associe à la catégorie "Restauration".
          </p>
          <p>
            <strong>2. Conflit</strong> — Si le mot "poisson" détecte la sous-catégorie "Poissonnerie" (Commerce), il y a un conflit car l'intention pointe vers "Restauration" ≠ "Commerce".
          </p>
          <p>
            <strong>3. Fusion</strong> — Si <strong>Fusion</strong> est activée, le moteur affiche les résultats des deux : restaurants avec service "Poisson" en premier, puis les poissonneries.
          </p>
          <p>
            <strong>4. Strict</strong> — Si Fusion est désactivée, seule la sous-catégorie détectée est utilisée (pas de merge avec l'intent).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntentManagement;
