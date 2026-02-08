import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Folder,
  FolderOpen,
  Tag,
  Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import IconPicker from "./IconPicker";

interface Category {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  adj_fr: string | null;
  adj_en: string | null;
  adj_ar: string | null;
  icon: string | null;
  sort_order: number;
}

interface Subcategory {
  id: string;
  category_id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  adj_fr: string | null;
  adj_en: string | null;
  adj_ar: string | null;
  icon: string | null;
  sort_order: number;
}

interface Service {
  id: string;
  subcategory_id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  sort_order: number;
}

type EditMode = {
  type: "category" | "subcategory" | "service";
  id: string | null; // null = new item
  parentId?: string;
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [editForm, setEditForm] = useState({
    name_fr: "",
    name_en: "",
    name_ar: "",
    adj_fr: "",
    adj_en: "",
    adj_ar: "",
    icon: "",
    sort_order: 0
  });
  
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "category" | "subcategory" | "service";
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, subRes, svcRes] = await Promise.all([
      supabase.from("categories").select("*").order("name_fr"),
      supabase.from("subcategories").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order")
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data);
    if (svcRes.data) setServices(svcRes.data);
    setLoading(false);
  };

  const startEdit = (mode: EditMode, item?: Category | Subcategory | Service) => {
    setEditMode(mode);
    if (item) {
      setEditForm({
        name_fr: item.name_fr,
        name_en: item.name_en || "",
        name_ar: item.name_ar || "",
        adj_fr: (item as Category).adj_fr || "",
        adj_en: (item as Category).adj_en || "",
        adj_ar: (item as Category).adj_ar || "",
        icon: (item as Category).icon || "",
        sort_order: item.sort_order || 0
      });
    } else {
      setEditForm({ name_fr: "", name_en: "", name_ar: "", adj_fr: "", adj_en: "", adj_ar: "", icon: "", sort_order: 0 });
    }
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditForm({ name_fr: "", name_en: "", name_ar: "", adj_fr: "", adj_en: "", adj_ar: "", icon: "", sort_order: 0 });
  };

  const saveItem = async () => {
    if (!editMode || !editForm.name_fr.trim()) {
      toast.error("Le nom français est requis");
      return;
    }

    setSaving(true);
    try {
      if (editMode.type === "category") {
        const data = {
          name_fr: editForm.name_fr.trim(),
          name_en: editForm.name_en.trim() || null,
          name_ar: editForm.name_ar.trim() || null,
          adj_fr: editForm.adj_fr.trim() || null,
          adj_en: editForm.adj_en.trim() || null,
          adj_ar: editForm.adj_ar.trim() || null,
          icon: editForm.icon.trim() || null,
          sort_order: editForm.sort_order
        };

        if (editMode.id) {
          await supabase.from("categories").update(data).eq("id", editMode.id);
          toast.success("Catégorie modifiée");
        } else {
          await supabase.from("categories").insert(data);
          toast.success("Catégorie créée");
        }
      } else if (editMode.type === "subcategory") {
        const subData = {
          category_id: editMode.parentId!,
          name_fr: editForm.name_fr.trim(),
          name_en: editForm.name_en.trim() || null,
          name_ar: editForm.name_ar.trim() || null,
          adj_fr: editForm.adj_fr.trim() || null,
          adj_en: editForm.adj_en.trim() || null,
          adj_ar: editForm.adj_ar.trim() || null,
          icon: editForm.icon.trim() || null,
          sort_order: editForm.sort_order
        };

        if (editMode.id) {
          await supabase.from("subcategories").update(subData).eq("id", editMode.id);
          toast.success("Sous-catégorie modifiée");
        } else {
          await supabase.from("subcategories").insert(subData);
          toast.success("Sous-catégorie créée");
        }
      } else if (editMode.type === "service") {
        const svcData = {
          subcategory_id: editMode.parentId!,
          name_fr: editForm.name_fr.trim(),
          name_en: editForm.name_en.trim() || null,
          name_ar: editForm.name_ar.trim() || null,
          icon: editForm.icon.trim() || null,
          sort_order: editForm.sort_order
        };

        if (editMode.id) {
          await supabase.from("services").update(svcData).eq("id", editMode.id);
          toast.success("Service modifié");
        } else {
          await supabase.from("services").insert(svcData);
          toast.success("Service créé");
        }
      }

      await fetchData();
      cancelEdit();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deleteDialog) return;

    setSaving(true);
    try {
      if (deleteDialog.type === "category") {
        await supabase.from("categories").delete().eq("id", deleteDialog.id);
        toast.success("Catégorie supprimée");
      } else if (deleteDialog.type === "subcategory") {
        await supabase.from("subcategories").delete().eq("id", deleteDialog.id);
        toast.success("Sous-catégorie supprimée");
      } else if (deleteDialog.type === "service") {
        await supabase.from("services").delete().eq("id", deleteDialog.id);
        toast.success("Service supprimé");
      }

      await fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setSaving(false);
      setDeleteDialog(null);
    }
  };

  const toggleCategory = (id: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedCategories(newSet);
  };

  const toggleSubcategory = (id: string) => {
    const newSet = new Set(expandedSubcategories);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSubcategories(newSet);
  };

  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories
      .filter(s => s.category_id === categoryId)
      .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  };

  const getServicesForSubcategory = (subcategoryId: string) => {
    return services
      .filter(s => s.subcategory_id === subcategoryId)
      .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderEditForm = (showIcon: boolean = false, showAdj: boolean = false) => (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Français *</label>
          <Input
            autoFocus
            value={editForm.name_fr}
            onChange={(e) => setEditForm(prev => ({ ...prev, name_fr: e.target.value }))}
            placeholder="Nom en français"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Anglais</label>
          <Input
            value={editForm.name_en}
            onChange={(e) => setEditForm(prev => ({ ...prev, name_en: e.target.value }))}
            placeholder="Name in English"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Arabe</label>
          <Input
            value={editForm.name_ar}
            onChange={(e) => setEditForm(prev => ({ ...prev, name_ar: e.target.value }))}
            placeholder="الاسم بالعربية"
            dir="rtl"
          />
        </div>
      </div>
      {showAdj && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Adj. Français</label>
            <Input
              value={editForm.adj_fr}
              onChange={(e) => setEditForm(prev => ({ ...prev, adj_fr: e.target.value }))}
              placeholder="ex: hôtelier, gastronomique..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Adj. Anglais</label>
            <Input
              value={editForm.adj_en}
              onChange={(e) => setEditForm(prev => ({ ...prev, adj_en: e.target.value }))}
              placeholder="e.g. hotel, gastronomic..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Adj. Arabe</label>
            <Input
              value={editForm.adj_ar}
              onChange={(e) => setEditForm(prev => ({ ...prev, adj_ar: e.target.value }))}
              placeholder="مثال: فندقي، فنّي..."
              dir="rtl"
            />
          </div>
        </div>
      )}
      {showIcon && (
        <div className="max-w-xs">
          <label className="text-xs font-medium text-muted-foreground">Icône</label>
          <IconPicker
            value={editForm.icon}
            onChange={(iconName) => setEditForm(prev => ({ ...prev, icon: iconName }))}
          />
        </div>
      )}
      <div className="max-w-[120px]">
        <label className="text-xs font-medium text-muted-foreground">Ordre</label>
        <Input
          type="number"
          value={editForm.sort_order}
          onChange={(e) => setEditForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
          placeholder="0"
          min={0}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={saveItem} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "..." : "Enregistrer"}
        </Button>
        <Button size="sm" variant="outline" onClick={cancelEdit}>
          <X className="h-4 w-4 mr-1" />
          Annuler
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gestion des catégories</h2>
        <Button onClick={() => startEdit({ type: "category", id: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle catégorie
        </Button>
      </div>

      {/* New category form */}
      {editMode?.type === "category" && editMode.id === null && renderEditForm(true, true)}

      {/* Categories list */}
      <div className="space-y-2">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const subs = getSubcategoriesForCategory(category.id);
          const isEditing = editMode?.type === "category" && editMode.id === category.id;

          return (
            <Card key={category.id}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                <div className="flex items-center gap-2 p-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  
                  {isExpanded ? (
                    <FolderOpen className="h-5 w-5 text-primary" />
                  ) : (
                    <Folder className="h-5 w-5 text-muted-foreground" />
                  )}
                  
                  <div className="flex-1">
                    <span className="font-medium">{category.name_fr}</span>
                    {category.name_en && (
                      <span className="text-muted-foreground text-sm ml-2">({category.name_en})</span>
                    )}
                    {category.icon && (
                      <Badge variant="outline" className="ml-2 text-xs">{category.icon}</Badge>
                    )}
                  </div>
                  
                  <Badge variant="secondary">{subs.length} sous-cat.</Badge>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit({ type: "category", id: category.id }, category);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialog({
                        open: true,
                        type: "category",
                        id: category.id,
                        name: category.name_fr
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {isEditing && (
                  <div className="px-3 pb-3">
                    {renderEditForm(true, true)}
                  </div>
                )}

                <CollapsibleContent>
                  <div className="border-t px-3 py-2 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Sous-catégories</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit({ type: "subcategory", id: null, parentId: category.id })}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    </div>

                    {/* New subcategory form */}
                    {editMode?.type === "subcategory" && editMode.id === null && editMode.parentId === category.id && (
                      renderEditForm(true, true)
                    )}

                    {subs.map((sub) => {
                      const subIsExpanded = expandedSubcategories.has(sub.id);
                      const svcs = getServicesForSubcategory(sub.id);
                      const subIsEditing = editMode?.type === "subcategory" && editMode.id === sub.id;

                      return (
                        <Collapsible key={sub.id} open={subIsExpanded} onOpenChange={() => toggleSubcategory(sub.id)}>
                          <div className="ml-4 border rounded-lg bg-background">
                            <div className="flex items-center gap-2 p-2">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1">
                                  {subIsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </Button>
                              </CollapsibleTrigger>
                              
                              <div className="flex-1 text-sm">
                                <span>{sub.name_fr}</span>
                                {sub.name_en && (
                                  <span className="text-muted-foreground ml-2">({sub.name_en})</span>
                                )}
                              </div>
                              
                              <Badge variant="outline" className="text-xs">{svcs.length} services</Badge>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit({ type: "subcategory", id: sub.id, parentId: category.id }, sub);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialog({
                                    open: true,
                                    type: "subcategory",
                                    id: sub.id,
                                    name: sub.name_fr
                                  });
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>

                            {subIsEditing && (
                              <div className="px-2 pb-2">
                                {renderEditForm(true, true)}
                              </div>
                            )}

                            <CollapsibleContent>
                              <div className="border-t px-2 py-2 bg-muted/20 space-y-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    Services
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() => startEdit({ type: "service", id: null, parentId: sub.id })}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Ajouter
                                  </Button>
                                </div>

                                {/* New service form */}
                                {editMode?.type === "service" && editMode.id === null && editMode.parentId === sub.id && (
                                  renderEditForm(true, false)
                                )}

                                {svcs.map((svc) => {
                                  const svcIsEditing = editMode?.type === "service" && editMode.id === svc.id;

                                  return (
                                    <div key={svc.id} className="ml-2">
                                      {svcIsEditing ? (
                                        renderEditForm(true, false)
                                      ) : (
                                        <div className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 group">
                                          <span className="text-xs flex-1">
                                            {svc.name_fr}
                                            {svc.name_en && (
                                              <span className="text-muted-foreground ml-1">({svc.name_en})</span>
                                            )}
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={() => startEdit({ type: "service", id: svc.id, parentId: sub.id }, svc)}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={() => setDeleteDialog({
                                              open: true,
                                              type: "service",
                                              id: svc.id,
                                              name: svc.name_fr
                                            })}
                                          >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {svcs.length === 0 && editMode?.parentId !== sub.id && (
                                  <p className="text-xs text-muted-foreground italic ml-2">Aucun service</p>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}

                    {subs.length === 0 && editMode?.parentId !== category.id && (
                      <p className="text-sm text-muted-foreground italic">Aucune sous-catégorie</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {categories.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune catégorie. Cliquez sur "Nouvelle catégorie" pour commencer.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialog?.open} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deleteDialog?.name}" ?
              {deleteDialog?.type === "category" && " Toutes les sous-catégories et services associés seront également supprimés."}
              {deleteDialog?.type === "subcategory" && " Tous les services associés seront également supprimés."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoryManagement;
