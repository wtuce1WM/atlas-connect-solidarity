import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit, Egg, X, GripVertical, AlertTriangle, Phone, Eye } from "lucide-react";

interface EasterEgg {
  id: string;
  name: string;
  type: string;
  keywords: string[];
  is_active: boolean;
  config: Record<string, any>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  overlay: { label: "Overlay Image", color: "bg-purple-500/10 text-purple-700 border-purple-300" },
  celebrity_guide: { label: "Guide Insider", color: "bg-blue-500/10 text-blue-700 border-blue-300" },
  emergency: { label: "Urgence", color: "bg-red-500/10 text-red-700 border-red-300" },
};

const EasterEggManagement = () => {
  const [eggs, setEggs] = useState<EasterEgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEgg, setEditingEgg] = useState<EasterEgg | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const { toast } = useToast();

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("overlay");
  const [formKeywords, setFormKeywords] = useState<string[]>([]);
  const [formConfig, setFormConfig] = useState("{}");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchEggs = async () => {
    const { data, error } = await supabase
      .from("easter_eggs")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setEggs((data || []).map(d => ({ ...d, config: (typeof d.config === 'object' && d.config !== null && !Array.isArray(d.config) ? d.config : {}) as Record<string, any> })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchEggs(); }, []);

  const resetForm = () => {
    setFormName("");
    setFormType("overlay");
    setFormKeywords([]);
    setFormConfig("{}");
    setFormIsActive(true);
    setEditingEgg(null);
    setNewKeyword("");
  };

  const openEditForm = (egg: EasterEgg) => {
    setEditingEgg(egg);
    setFormName(egg.name);
    setFormType(egg.type);
    setFormKeywords([...egg.keywords]);
    setFormConfig(JSON.stringify(egg.config, null, 2));
    setFormIsActive(egg.is_active);
    setShowForm(true);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }

    let parsedConfig: Record<string, any>;
    try {
      parsedConfig = JSON.parse(formConfig);
    } catch {
      toast({ title: "JSON config invalide", variant: "destructive" });
      return;
    }

    const payload = {
      name: formName.trim(),
      type: formType,
      keywords: formKeywords,
      is_active: formIsActive,
      config: parsedConfig,
      updated_at: new Date().toISOString(),
    };

    if (editingEgg) {
      const { error } = await supabase.from("easter_eggs").update(payload).eq("id", editingEgg.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Easter egg mis à jour ✓" });
    } else {
      const { error } = await supabase.from("easter_eggs").insert({
        ...payload,
        sort_order: eggs.length,
      });
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Easter egg créé ✓" });
    }

    setShowForm(false);
    resetForm();
    fetchEggs();
  };

  const handleDelete = async (egg: EasterEgg) => {
    if (!window.confirm(`Supprimer l'easter egg "${egg.name}" ?`)) return;
    const { error } = await supabase.from("easter_eggs").delete().eq("id", egg.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Easter egg supprimé ✓" });
    fetchEggs();
  };

  const toggleActive = async (egg: EasterEgg) => {
    const { error } = await supabase.from("easter_eggs").update({ is_active: !egg.is_active }).eq("id", egg.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    fetchEggs();
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !formKeywords.includes(kw)) {
      setFormKeywords([...formKeywords, kw]);
    }
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    setFormKeywords(formKeywords.filter(k => k !== kw));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gold/10 p-3 rounded-lg">
            <Egg className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Easter Eggs</h2>
            <p className="text-sm text-muted-foreground">{eggs.length} easter egg(s) configuré(s)</p>
          </div>
        </div>
        <Button onClick={openNewForm} className="bg-gold hover:bg-gold/90 text-black">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {eggs.map((egg) => {
          const typeInfo = TYPE_LABELS[egg.type] || { label: egg.type, color: "bg-muted text-muted-foreground" };
          return (
            <Card key={egg.id} className={`transition-all ${!egg.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{egg.name}</h3>
                      <Badge variant="outline" className={typeInfo.color}>
                        {typeInfo.label}
                      </Badge>
                      {!egg.is_active && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Désactivé
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {egg.keywords.map((kw, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-foreground/5 text-foreground/70 border">
                          {kw}
                        </span>
                      ))}
                    </div>

                    {egg.type === "emergency" && egg.config?.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{egg.config.label}: <strong>{egg.config.phone}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={egg.is_active} onCheckedChange={() => toggleActive(egg)} />
                    <Button variant="ghost" size="icon" onClick={() => openEditForm(egg)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(egg)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {eggs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Egg className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun easter egg configuré</p>
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEgg ? `Modifier "${editingEgg.name}"` : "Nouvel Easter Egg"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Zitoun Musk" />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overlay">Overlay Image</SelectItem>
                  <SelectItem value="celebrity_guide">Guide Insider</SelectItem>
                  <SelectItem value="emergency">Urgence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label>{formIsActive ? "Actif" : "Désactivé"}</Label>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label>Mots-clés déclencheurs ({formKeywords.length})</Label>
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Ajouter un mot-clé..."
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                />
                <Button type="button" variant="outline" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gold/10 text-foreground border border-gold/30"
                  >
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Config JSON */}
            <div className="space-y-2">
              <Label>Configuration (JSON)</Label>
              <Textarea
                value={formConfig}
                onChange={(e) => setFormConfig(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                placeholder='{"title": "...", "subtitle": "..."}'
              />
              <p className="text-xs text-muted-foreground">
                Overlay : title, subtitle, image · Urgence : color, phone, label
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-gold hover:bg-gold/90 text-black">
              {editingEgg ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EasterEggManagement;
