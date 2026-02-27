import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Loader2, Package, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BadgeOption {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

interface BundleEntry {
  id: string;
  keyword: string;
  subcategory_name: string | null;
  required_service: string | null;
  is_active: boolean;
  sort_order: number;
  badge_id: string | null;
}

const SearchBundleManagement = () => {
  const [bundles, setBundles] = useState<BundleEntry[]>([]);
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEntry, setNewEntry] = useState({ keyword: "", subcategory_name: "", required_service: "", badge_id: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ subcategory_name: string; required_service: string; badge_id: string }>({ subcategory_name: "", required_service: "", badge_id: "" });
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null);
  const [editKeywordValue, setEditKeywordValue] = useState("");

  const canAddEntry = newEntry.keyword.trim().length > 0;

  const loadBundles = useCallback(async () => {
    setIsLoading(true);
    const [bundlesRes, badgesRes] = await Promise.all([
      supabase.from("search_bundles").select("*").order("created_at", { ascending: false }).order("sort_order"),
      supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order"),
    ]);
    if (bundlesRes.error) {
      toast({ title: "Erreur", description: bundlesRes.error.message, variant: "destructive" });
    } else {
      setBundles((bundlesRes.data as any[]) || []);
    }
    if (badgesRes.data) setBadges(badgesRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadBundles(); }, [loadBundles]);

  const addEntry = async () => {
    if (!newEntry.keyword.trim()) {
      toast({ title: "Champs requis", description: "Le mot-clé est obligatoire.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("search_bundles").insert({
      keyword: newEntry.keyword.trim().toLowerCase(),
      subcategory_name: newEntry.subcategory_name.trim() || null,
      required_service: newEntry.required_service.trim() || null,
      badge_id: newEntry.badge_id || null,
      sort_order: bundles.filter(b => b.keyword === newEntry.keyword.trim().toLowerCase()).length + 1,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ajouté" });
      setNewEntry({ keyword: "", subcategory_name: "", required_service: "", badge_id: "" });
      loadBundles();
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("search_bundles").update({ is_active } as any).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setBundles(prev => prev.map(b => b.id === id ? { ...b, is_active } : b));
    }
  };

  const startEdit = (entry: BundleEntry) => {
    setEditingId(entry.id);
    setEditValues({ subcategory_name: entry.subcategory_name || "", required_service: entry.required_service || "", badge_id: entry.badge_id || "" });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("search_bundles").update({
      subcategory_name: editValues.subcategory_name.trim() || null,
      required_service: editValues.required_service.trim() || null,
      badge_id: editValues.badge_id || null,
    } as any).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setBundles(prev => prev.map(b => b.id === id ? { ...b, subcategory_name: editValues.subcategory_name.trim() || null, required_service: editValues.required_service.trim() || null, badge_id: editValues.badge_id || null } : b));
      setEditingId(null);
      toast({ title: "Sauvegardé" });
    }
  };

  const duplicateBundle = async (keyword: string, entries: BundleEntry[]) => {
    const newKeyword = keyword + "-copie";
    const inserts = entries.map((e, i) => ({
      keyword: newKeyword,
      subcategory_name: e.subcategory_name,
      required_service: e.required_service,
      sort_order: i + 1,
      is_active: e.is_active,
      badge_id: e.badge_id,
    }));
    const { error } = await supabase.from("search_bundles").insert(inserts as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Bundle "${keyword}" dupliqué` });
      loadBundles();
    }
  };

  const duplicateEntry = async (entry: BundleEntry) => {
    const { error } = await supabase.from("search_bundles").insert({
      keyword: entry.keyword,
      subcategory_name: entry.subcategory_name,
      required_service: entry.required_service,
      sort_order: bundles.filter(b => b.keyword === entry.keyword).length + 1,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dupliqué" });
      loadBundles();
    }
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("search_bundles").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setBundles(prev => prev.filter(b => b.id !== id));
      toast({ title: "Supprimé" });
    }
  };

  const saveKeyword = async (oldKeyword: string) => {
    const newKw = editKeywordValue.trim().toLowerCase();
    if (!newKw) {
      toast({ title: "Mot-clé requis", variant: "destructive" });
      return;
    }
    const ids = bundles.filter(b => b.keyword === oldKeyword).map(b => b.id);
    const { error } = await supabase.from("search_bundles").update({ keyword: newKw } as any).in("id", ids);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setBundles(prev => prev.map(b => ids.includes(b.id) ? { ...b, keyword: newKw } : b));
      setEditingKeyword(null);
      toast({ title: "Mot-clé mis à jour" });
    }
  };


  // Group by keyword
  const grouped = bundles.reduce<Record<string, BundleEntry[]>>((acc, b) => {
    if (!acc[b.keyword]) acc[b.keyword] = [];
    acc[b.keyword].push(b);
    return acc;
  }, {});


  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Regroupements de recherche (Bundles)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Quand un mot-clé est détecté dans la requête, le moteur cherche dans toutes les sous-catégories listées, 
            en filtrant par le service requis pour chacune. Un <code>subcategory_name</code> vide = wildcard (toutes les sous-catégories).
          </p>
        </CardHeader>
        <CardContent>
          {/* Add form */}
          <div className="flex gap-2 mb-6 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mot-clé</label>
              <Input
                placeholder="ex: louer"
                value={newEntry.keyword}
                onChange={e => setNewEntry(prev => ({ ...prev, keyword: e.target.value }))}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Sous-catégorie</label>
              <Input
                placeholder="vide = wildcard"
                value={newEntry.subcategory_name}
                onChange={e => setNewEntry(prev => ({ ...prev, subcategory_name: e.target.value }))}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Service requis</label>
              <Input
                placeholder="ex: A louer"
                value={newEntry.required_service}
                onChange={e => setNewEntry(prev => ({ ...prev, required_service: e.target.value }))}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Badge</label>
              <Select value={newEntry.badge_id || "none"} onValueChange={val => setNewEntry(prev => ({ ...prev, badge_id: val === "none" ? "" : val }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {badges.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color_hex || '#ccc' }} />
                        {b.name_fr}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addEntry} size="sm" className="shrink-0" disabled={!canAddEntry}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>

          {/* Grouped display */}
          {Object.keys(grouped).length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun regroupement configuré.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([keyword, entries]) => (
                <Card key={keyword} className="border">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {editingKeyword === keyword ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editKeywordValue}
                            onChange={e => setEditKeywordValue(e.target.value)}
                            className="h-7 w-40 text-sm font-mono"
                            onKeyDown={e => { if (e.key === "Enter") saveKeyword(keyword); if (e.key === "Escape") setEditingKeyword(null); }}
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveKeyword(keyword)}>
                            <Save className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-sm font-mono cursor-pointer hover:opacity-80"
                          onClick={() => { setEditingKeyword(keyword); setEditKeywordValue(keyword); }}
                        >
                          {keyword}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{entries.length} entrée(s)</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {entries.every(e => e.is_active) ? "Actif" : entries.some(e => e.is_active) ? "Partiel" : "Inactif"}
                        </span>
                        <Switch
                          checked={entries.every(e => e.is_active)}
                          onCheckedChange={async (checked) => {
                            const ids = entries.map(e => e.id);
                            const { error } = await supabase.from("search_bundles").update({ is_active: checked } as any).in("id", ids);
                            if (error) {
                              toast({ title: "Erreur", description: error.message, variant: "destructive" });
                            } else {
                              setBundles(prev => prev.map(b => ids.includes(b.id) ? { ...b, is_active: checked } : b));
                            }
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateBundle(keyword, entries)} title="Dupliquer le bundle">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sous-catégorie</TableHead>
                          <TableHead>Service requis</TableHead>
                          <TableHead>Badge</TableHead>
                          <TableHead className="w-20">Actif</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map(entry => (
                          <TableRow key={entry.id} onDoubleClick={() => startEdit(entry)}>
                            <TableCell className="font-medium">
                              {editingId === entry.id ? (
                                <Input
                                  value={editValues.subcategory_name}
                                  onChange={e => setEditValues(prev => ({ ...prev, subcategory_name: e.target.value }))}
                                  placeholder="* (wildcard)"
                                  className="h-8"
                                />
                              ) : (
                                entry.subcategory_name || <span className="text-muted-foreground italic">* (wildcard)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {editingId === entry.id ? (
                                <Input
                                  value={editValues.required_service}
                                  onChange={e => setEditValues(prev => ({ ...prev, required_service: e.target.value }))}
                                  className="h-8"
                                />
                              ) : (
                                entry.required_service || <span className="text-muted-foreground italic">— (aucun)</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === entry.id ? (
                                <Select value={editValues.badge_id || "none"} onValueChange={val => setEditValues(prev => ({ ...prev, badge_id: val === "none" ? "" : val }))}>
                                  <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Aucun</SelectItem>
                                    {badges.map(b => (
                                      <SelectItem key={b.id} value={b.id}>
                                        <span className="flex items-center gap-1.5">
                                          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color_hex || '#ccc' }} />
                                          {b.name_fr}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                (() => {
                                  const bdg = badges.find(b => b.id === entry.badge_id);
                                  return bdg ? (
                                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: bdg.color_hex || '#ccc', color: bdg.text_color_hex || '#fff' }}>
                                      {bdg.name_fr}
                                    </span>
                                  ) : <span className="text-muted-foreground italic text-xs">—</span>;
                                })()
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={entry.is_active}
                                onCheckedChange={checked => toggleActive(entry.id, checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {editingId === entry.id ? (
                                  <Button variant="ghost" size="icon" onClick={() => saveEdit(entry.id)}>
                                    <Save className="h-4 w-4 text-primary" />
                                  </Button>
                                ) : null}
                                <Button variant="ghost" size="icon" onClick={() => duplicateEntry(entry)} title="Dupliquer">
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        L'entrée « {entry.required_service} » du bundle « {entry.keyword} » sera supprimée définitivement.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteEntry(entry.id)}>Supprimer</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchBundleManagement;
