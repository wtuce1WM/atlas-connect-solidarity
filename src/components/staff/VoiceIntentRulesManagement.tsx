import { useState, useEffect, useCallback } from "react";
import { Plus, X, Loader2, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

interface VoiceIntentRule {
  id: string;
  rule_text: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const VoiceIntentRulesManagement = () => {
  const [rules, setRules] = useState<VoiceIntentRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRuleText, setNewRuleText] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("voice_intent_rules")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (data) setRules(data as VoiceIntentRule[]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const addRule = useCallback(async () => {
    const text = newRuleText.trim();
    if (!text) return;
    try {
      const maxOrder = rules.length > 0 ? Math.max(...rules.map(r => r.sort_order)) : 0;
      const { data, error } = await supabase
        .from("voice_intent_rules")
        .insert({ rule_text: text, sort_order: maxOrder + 1 })
        .select()
        .single();
      if (error) throw error;
      setRules(prev => [...prev, data as VoiceIntentRule]);
      setNewRuleText("");
      toast({ title: "Règle ajoutée" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, [newRuleText, rules]);

  const toggleActive = useCallback(async (id: string, is_active: boolean) => {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from("voice_intent_rules")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active } : r));
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("voice_intent_rules").delete().eq("id", id);
      if (error) throw error;
      setRules(prev => prev.filter(r => r.id !== id));
      toast({ title: "Règle supprimée" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = rules.filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {rules.length} règle{rules.length > 1 ? "s" : ""} override
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {activeCount} active{activeCount > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Add new rule */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <label className="text-xs text-muted-foreground font-medium block">
            Nouvelle règle (instruction pour le LLM)
          </label>
          <Textarea
            placeholder={`Ex: "tajine poulet" → "tajine poulet" (garder tel quel, ne PAS remplacer par "cuisine marocaine")`}
            value={newRuleText}
            onChange={e => setNewRuleText(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <Button
            onClick={addRule}
            disabled={!newRuleText.trim()}
            className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </CardContent>
      </Card>

      {/* Rules list */}
      {rules.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucune règle override. Les règles de base du prompt s'appliquent.</p>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
              <CardContent className="p-3 flex items-start gap-3">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={checked => toggleActive(rule.id, checked)}
                  className="mt-1 shrink-0"
                />
                <p className="text-sm flex-1 whitespace-pre-wrap">{rule.rule_text}</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
                      <X className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer cette règle ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Non</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteRule(rule.id)}
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

      {/* Documentation */}
      <Card className="bg-muted/40 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Comment fonctionnent les overrides vocaux
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong>Règles de base</strong> — Le prompt contient ~100 règles de mapping codées en dur (ex: "manger" → "restaurant", "dormir" → "hôtel").
          </p>
          <p>
            <strong>Overrides</strong> — Les règles ajoutées ici sont injectées en fin de prompt avec la mention "RÈGLES ADDITIONNELLES (overrides prioritaires)". Elles ont priorité sur les règles de base.
          </p>
          <p>
            <strong>Format</strong> — Écrivez comme une instruction directe au LLM, ex: <em>"langouste" → garder "langouste" tel quel, NE PAS remplacer par "fruits de mer"</em>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceIntentRulesManagement;
