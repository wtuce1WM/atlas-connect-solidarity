import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface NoiseWord {
  id: string;
  word: string;
  is_active: boolean;
}

const NoiseWordsManagement = () => {
  const [words, setWords] = useState<NoiseWord[]>([]);
  const [newWord, setNewWord] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("search_noise_words")
      .select("*")
      .order("word");
    if (data) setWords(data as NoiseWord[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addWord = async () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    const { error } = await supabase.from("search_noise_words").insert({ word: w });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewWord("");
      load();
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("search_noise_words").update({ is_active }).eq("id", id);
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_active } : w));
  };

  const deleteWord = async (id: string) => {
    await supabase.from("search_noise_words").delete().eq("id", id);
    setWords(prev => prev.filter(w => w.id !== id));
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mots bruyants ignorés dans la recherche</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ces adjectifs/mots sont supprimés des requêtes car ils ne correspondent à aucun vecteur de recherche.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            placeholder="Ajouter un mot..."
            onKeyDown={e => e.key === "Enter" && addWord()}
            className="max-w-xs"
          />
          <Button size="sm" onClick={addWord} className="bg-amber-600 hover:bg-amber-700 text-white"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {words.map(w => (
            <Badge
              key={w.id}
              variant={w.is_active ? "default" : "outline"}
              className={`gap-1.5 py-1 px-2 cursor-pointer group ${w.is_active ? "bg-green-200 hover:bg-green-300 text-black border-green-300" : ""}`}
            >
              <Switch
                checked={w.is_active}
                onCheckedChange={v => toggleActive(w.id, v)}
                className="scale-75"
              />
              <span className={w.is_active ? "" : "line-through opacity-50"}>{w.word}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Voulez-vous vraiment supprimer le mot « {w.word} » ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteWord(w.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{words.filter(w => w.is_active).length} mots actifs sur {words.length}</p>
      </CardContent>
    </Card>
  );
};

export default NoiseWordsManagement;
