import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, LayoutGrid, Save, X } from "lucide-react";

interface FrontEntry {
  id: string;
  name: string;
  sort_order: number;
  subcategory_ids: string[];
}

interface Subcategory {
  id: string;
  name_fr: string;
  category_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inline?: boolean;
}

const FrontStructureManagement = ({ open, onOpenChange, inline = false }: Props) => {
  const [entries, setEntries] = useState<FrontEntry[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null); // null = new
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editSubIds, setEditSubIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const [entriesRes, linksRes, subsRes, catsRes] = await Promise.all([
      supabase.from("front_structure").select("*").order("sort_order"),
      supabase.from("front_structure_subcategories").select("*"),
      supabase.from("subcategories").select("id, name_fr, category_id").order("name_fr"),
      supabase.from("categories").select("id, name_fr"),
    ]);

    const catMap: Record<string, string> = {};
    (catsRes.data || []).forEach((c: any) => { catMap[c.id] = c.name_fr; });

    setSubcategories(
      (subsRes.data || []).map((s: any) => ({
        id: s.id,
        name_fr: s.name_fr,
        category_name: catMap[s.category_id] || "?",
      }))
    );

    const linksByEntry: Record<string, string[]> = {};
    (linksRes.data || []).forEach((l: any) => {
      if (!linksByEntry[l.front_structure_id]) linksByEntry[l.front_structure_id] = [];
      linksByEntry[l.front_structure_id].push(l.subcategory_id);
    });

    setEntries(
      (entriesRes.data || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        sort_order: e.sort_order,
        subcategory_ids: linksByEntry[e.id] || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (open || inline) load();
  }, [open, inline]);

  const startNew = () => {
    setEditingId(null);
    setEditName("");
    setEditSortOrder(entries.length);
    setEditSubIds(new Set());
    setShowForm(true);
  };

  const startEdit = (entry: FrontEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditSortOrder(entry.sort_order);
    setEditSubIds(new Set(entry.subcategory_ids));
    setShowForm(true);
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const toggleSub = (id: string) => {
    setEditSubIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveEntry = async () => {
    if (!editName.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      let entryId = editingId;
      if (editingId) {
        await supabase.from("front_structure").update({ name: editName.trim(), sort_order: editSortOrder }).eq("id", editingId);
      } else {
        const { data } = await supabase.from("front_structure").insert({ name: editName.trim(), sort_order: editSortOrder }).select("id").single();
        entryId = data?.id;
      }

      if (entryId) {
        // Sync subcategories: delete all then re-insert
        await supabase.from("front_structure_subcategories").delete().eq("front_structure_id", entryId);
        const subIds = Array.from(editSubIds);
        if (subIds.length > 0) {
          await supabase.from("front_structure_subcategories").insert(
            subIds.map((sid, i) => ({ front_structure_id: entryId!, subcategory_id: sid, sort_order: i }))
          );
        }
      }

      toast.success(editingId ? "Entrée modifiée" : "Entrée créée");
      cancelEdit();
      await load();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("front_structure").delete().eq("id", id);
    toast.success("Entrée supprimée");
    load();
  };

  const getSubName = (id: string) => subcategories.find(s => s.id === id)?.name_fr || "?";

  const filteredSubs = subcategories.filter(s => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return s.name_fr.toLowerCase().includes(q) || s.category_name.toLowerCase().includes(q);
  });

  // Group by category
  const grouped = filteredSubs.reduce((acc, s) => {
    if (!acc[s.category_name]) acc[s.category_name] = [];
    acc[s.category_name].push(s);
    return acc;
  }, {} as Record<string, Subcategory[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Structure du front
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {!showForm && (
              <Button size="sm" onClick={startNew}>
                <Plus className="h-4 w-4 mr-1" /> Nouvelle entrée
              </Button>
            )}

            {showForm && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground">Nom</label>
                      <Input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Ex: Hébergement, Gastronomie..."
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-xs font-medium text-muted-foreground">Ordre</label>
                      <Input
                        type="number"
                        value={editSortOrder}
                        onChange={e => setEditSortOrder(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Sous-catégories liées ({editSubIds.size} sélectionnée{editSubIds.size > 1 ? "s" : ""})
                    </label>
                    <Input
                      placeholder="Filtrer les sous-catégories..."
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      className="mb-2"
                    />
                    <div className="max-h-[250px] overflow-y-auto border rounded-md p-2 space-y-2">
                      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, "fr")).map(([catName, subs]) => (
                        <div key={catName}>
                          <div className="text-xs font-semibold text-muted-foreground mb-1">{catName}</div>
                          <div className="grid grid-cols-2 gap-1 ml-2">
                            {subs.map(s => (
                              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                                <Checkbox
                                  checked={editSubIds.has(s.id)}
                                  onCheckedChange={() => toggleSub(s.id)}
                                />
                                {s.name_fr}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEntry} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Sauvegarder
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-1" /> Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {entries.length === 0 && !showForm && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune entrée configurée.
              </p>
            )}

            {entries.map(entry => (
              <Card key={entry.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.name}</span>
                      <Badge variant="secondary" className="text-xs">#{entry.sort_order}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(entry)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Supprimer l'entrée « {entry.name} » et ses liaisons ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Non</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteEntry(entry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Oui
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.subcategory_ids.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">Aucune sous-catégorie liée</span>
                    )}
                    {entry.subcategory_ids.map(sid => (
                      <Badge key={sid} variant="outline" className="text-xs">
                        {getSubName(sid)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FrontStructureManagement;
