import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConfigEntry {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (rapide)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (équilibré)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (économique)" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro (premium)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (premium)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (économique)" },
];

const AIConfigManagement = () => {
  const [configs, setConfigs] = useState<Record<string, ConfigEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchConfigs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("ai_config")
      .select("*")
      .order("key");

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else if (data) {
      const map: Record<string, ConfigEntry> = {};
      const vals: Record<string, string> = {};
      data.forEach((d: any) => {
        map[d.key] = d;
        vals[d.key] = d.value;
      });
      setConfigs(map);
      setEditValues(vals);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const updates = Object.entries(editValues).map(([key, value]) => {
      const entry = configs[key];
      if (!entry) return null;
      return supabase
        .from("ai_config")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", entry.id);
    }).filter(Boolean);

    const results = await Promise.all(updates);
    const hasError = results.some((r: any) => r?.error);

    if (hasError) {
      toast({ title: "Erreur", description: "Certains paramètres n'ont pas pu être sauvegardés", variant: "destructive" });
    } else {
      toast({ title: "Sauvegardé", description: "Configuration IA mise à jour" });
      fetchConfigs();
    }
    setIsSaving(false);
  };

  const updateVal = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const tempValue = parseFloat(editValues.temperature || "0.7");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-gold" />
          <div>
            <h2 className="text-xl font-bold">Configuration IA — Concierge</h2>
            <p className="text-sm text-muted-foreground">Paramètres du prompt utilisé pour les suggestions de recherche</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchConfigs}>
            <RefreshCw className="h-4 w-4 mr-1" /> Recharger
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Persona */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Persona</CardTitle>
            <CardDescription>{configs.persona?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editValues.persona || ""}
              onChange={e => updateVal("persona", e.target.value)}
              rows={3}
              className="resize-y"
            />
          </CardContent>
        </Card>

        {/* Tone */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ton</CardTitle>
            <CardDescription>{configs.tone?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editValues.tone || ""}
              onChange={e => updateVal("tone", e.target.value)}
              rows={2}
              className="resize-y"
            />
          </CardContent>
        </Card>

        {/* Extra instructions */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Instructions supplémentaires</CardTitle>
            <CardDescription>{configs.extra_instructions?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editValues.extra_instructions || ""}
              onChange={e => updateVal("extra_instructions", e.target.value)}
              rows={4}
              placeholder="Ajoutez des instructions supplémentaires pour le concierge IA..."
              className="resize-y"
            />
          </CardContent>
        </Card>

        {/* No results instructions */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Instructions (aucun résultat)</CardTitle>
            <CardDescription>{configs.no_results_instructions?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editValues.no_results_instructions || ""}
              onChange={e => updateVal("no_results_instructions", e.target.value)}
              rows={3}
              className="resize-y"
            />
          </CardContent>
        </Card>

        {/* Model */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Modèle IA</CardTitle>
            <CardDescription>{configs.model?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={editValues.model || ""} onValueChange={v => updateVal("model", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Response length */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Longueur de réponse</CardTitle>
            <CardDescription>{configs.response_length?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={editValues.response_length || ""}
              onChange={e => updateVal("response_length", e.target.value)}
              placeholder="5-8"
            />
          </CardContent>
        </Card>

        {/* Max tokens */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Max tokens</CardTitle>
            <CardDescription>{configs.max_tokens?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={editValues.max_tokens || ""}
              onChange={e => updateVal("max_tokens", e.target.value)}
              min={100}
              max={2000}
            />
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Température: {tempValue}</CardTitle>
            <CardDescription>{configs.temperature?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={[tempValue]}
              onValueChange={([v]) => updateVal("temperature", v.toString())}
              min={0}
              max={1}
              step={0.05}
            />
          </CardContent>
        </Card>

        {/* Boost verified */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Privilégier les établissements vérifiés</CardTitle>
                <CardDescription>{configs.boost_verified?.description || "L'IA mentionnera en priorité les établissements au statut WTUCE vérifié"}</CardDescription>
              </div>
              <Switch
                checked={editValues.boost_verified !== "false"}
                onCheckedChange={v => updateVal("boost_verified", v ? "true" : "false")}
              />
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default AIConfigManagement;
