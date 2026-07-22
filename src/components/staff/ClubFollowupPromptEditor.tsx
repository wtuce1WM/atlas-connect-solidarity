import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PROMPT = `You generate exactly 3 short, natural follow-up questions the user might ask next, in {{LANG_LABEL}}. Each under 90 chars, no numbering, no quotes, one per line.

CRITICAL — each follow-up MUST be SELF-CONTAINED and carry forward ALL explicit constraints from the current conversation (category, city/area, keywords like "rooftop bar", exclusions like "pas d'hôtel", landmark like "vue Koutoubia", price, ambiance, etc.). A short pronoun-only question like "Lequel a la meilleure ambiance le soir ?" is FORBIDDEN — rewrite it as "Quel rooftop bar (pas hôtel) à Marrakech a la meilleure ambiance le soir ?".

The user will click ONE of these as a new turn and prior constraints must be re-searchable from the question alone. Return ONLY the 3 lines.`;

const KEY = "club_followup_prompt";

const ClubFollowupPromptEditor = () => {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ai_config").select("value").eq("key", KEY).maybeSingle();
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    const v = (data?.value as string) || DEFAULT_PROMPT;
    setValue(v);
    setInitial(v);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ai_config")
      .upsert({ key: KEY, value, description: "Prompt système des 3 follow-ups Chat IA Club. Placeholder: {{LANG_LABEL}}." }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setInitial(value);
    toast({ title: "Sauvegardé", description: "Prompt des follow-ups mis à jour." });
  };

  const dirty = value !== initial;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggestions Chat IA du Club — Prompt des follow-ups</CardTitle>
        <CardDescription>
          Prompt système utilisé par <code>club-ai-chat</code> pour générer les 3 questions suggérées après chaque réponse.
          Placeholder disponible : <code>{"{{LANG_LABEL}}"}</code> (remplacé par French / English / Arabic).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gold" /></div>
        ) : (
          <>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={14}
              className="font-mono text-xs"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setValue(DEFAULT_PROMPT)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser
              </Button>
              <Button size="sm" disabled={!dirty || saving} onClick={save}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Sauvegarder
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubFollowupPromptEditor;
