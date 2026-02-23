import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
  Loader2,
  ExternalLink,
  Settings,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import IconPicker, { ICONS } from "./IconPicker";

// Helper component to render dynamic icons
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = ICONS[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};

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
  front_color: string;
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
  keywords: string[] | null;
}

type EditMode = {
  type: "category" | "subcategory" | "service";
  id: string | null; // null = new item
  parentId?: string;
};

interface BusinessMini {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
}

interface BusinessesPopup {
  title: string;
  businesses: BusinessMini[];
  loading: boolean;
}

const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  
  const [businessesPopup, setBusinessesPopup] = useState<BusinessesPopup | null>(null);

  const openCategoryBusinesses = async (e: React.MouseEvent, categoryId: string, categoryName: string) => {
    e.stopPropagation();
    setBusinessesPopup({ title: `Entreprises – ${categoryName}`, businesses: [], loading: true });
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city, is_active")
      .eq("main_category", categoryName)
      .order("name");
    setBusinessesPopup({ title: `Entreprises – ${categoryName}`, businesses: data || [], loading: false });
  };

  const openSubcategoryBusinesses = async (e: React.MouseEvent, subName: string) => {
    e.stopPropagation();
    setBusinessesPopup({ title: `Entreprises – ${subName}`, businesses: [], loading: true });
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city, is_active")
      .contains("categories", [subName])
      .order("name");
    setBusinessesPopup({ title: `Entreprises – ${subName}`, businesses: data || [], loading: false });
  };

  const openServiceBusinesses = async (e: React.MouseEvent, svcName: string) => {
    e.stopPropagation();
    setBusinessesPopup({ title: `Entreprises – ${svcName}`, businesses: [], loading: true });
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city, is_active")
      .contains("services", [svcName])
      .order("name");
    setBusinessesPopup({ title: `Entreprises – ${svcName}`, businesses: data || [], loading: false });
  };

  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [editForm, setEditForm] = useState({
    name_fr: "",
    name_en: "",
    name_ar: "",
    adj_fr: "",
    adj_en: "",
    adj_ar: "",
    icon: "",
    sort_order: 0,
    front_color: "white",
    keywords: ""
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

  const [businessCountBySub, setBusinessCountBySub] = useState<Record<string, number>>({});
  const [businessCountBySvc, setBusinessCountBySvc] = useState<Record<string, number>>({});
  const [businessCountByCat, setBusinessCountByCat] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    const [catRes, subRes, svcRes, bizRes] = await Promise.all([
      supabase.from("categories").select("*").order("name_fr"),
      supabase.from("subcategories").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("businesses").select("main_category, categories, services").eq("is_active", true),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data);
    if (svcRes.data) setServices(svcRes.data);

    // Count businesses per subcategory name and service name
    if (bizRes.data && catRes.data && subRes.data && svcRes.data) {
      const subCounts: Record<string, number> = {};
      const svcCounts: Record<string, number> = {};
      const catCounts: Record<string, number> = {};

      // Build category name->id map
      const catNameToId: Record<string, string> = {};
      for (const c of catRes.data) {
        catNameToId[c.name_fr] = c.id;
        if (c.name_en) catNameToId[c.name_en] = c.id;
        if (c.name_ar) catNameToId[c.name_ar] = c.id;
      }

      // Build name->ids maps for subcategories and services (a name can map to multiple IDs)
      const subNameToIds: Record<string, string[]> = {};
      for (const s of subRes.data) {
        const names = [s.name_fr, s.name_en, s.name_ar].filter(Boolean) as string[];
        for (const n of names) {
          if (!subNameToIds[n]) subNameToIds[n] = [];
          if (!subNameToIds[n].includes(s.id)) subNameToIds[n].push(s.id);
        }
      }
      const svcNameToIds: Record<string, string[]> = {};
      for (const s of svcRes.data) {
        const names = [s.name_fr, s.name_en, s.name_ar].filter(Boolean) as string[];
        for (const n of names) {
          if (!svcNameToIds[n]) svcNameToIds[n] = [];
          if (!svcNameToIds[n].includes(s.id)) svcNameToIds[n].push(s.id);
        }
      }

      for (const biz of bizRes.data) {
        // Count by main_category
        const mc = biz.main_category as string | null;
        if (mc) {
          const catId = catNameToId[mc];
          if (catId) catCounts[catId] = (catCounts[catId] || 0) + 1;
        }

        const cats = (biz.categories as string[]) || [];
        const svcs = (biz.services as string[]) || [];
        const countedSubIds = new Set<string>();
        const countedSvcIds = new Set<string>();
        for (const c of cats) {
          const ids = subNameToIds[c] || [];
          for (const id of ids) {
            if (!countedSubIds.has(id)) {
              countedSubIds.add(id);
              subCounts[id] = (subCounts[id] || 0) + 1;
            }
          }
        }
        for (const s of svcs) {
          const ids = svcNameToIds[s] || [];
          for (const id of ids) {
            if (!countedSvcIds.has(id)) {
              countedSvcIds.add(id);
              svcCounts[id] = (svcCounts[id] || 0) + 1;
            }
          }
        }
      }
      setBusinessCountByCat(catCounts);
      setBusinessCountBySub(subCounts);
      setBusinessCountBySvc(svcCounts);
    }

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
        sort_order: item.sort_order || 0,
        front_color: (item as Category).front_color || "white",
        keywords: ((item as Service).keywords || []).join(", ")
      });
    } else {
      setEditForm({ name_fr: "", name_en: "", name_ar: "", adj_fr: "", adj_en: "", adj_ar: "", icon: "", sort_order: 0, front_color: "white", keywords: "" });
    }
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditForm({ name_fr: "", name_en: "", name_ar: "", adj_fr: "", adj_en: "", adj_ar: "", icon: "", sort_order: 0, front_color: "white", keywords: "" });
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
          sort_order: editForm.sort_order,
          front_color: editForm.front_color
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
        const keywordsArray = editForm.keywords
          .split(",")
          .map(k => k.trim())
          .filter(k => k.length > 0);
        const svcData = {
          subcategory_id: editMode.parentId!,
          name_fr: editForm.name_fr.trim(),
          name_en: editForm.name_en.trim() || null,
          name_ar: editForm.name_ar.trim() || null,
          icon: editForm.icon.trim() || null,
          sort_order: editForm.sort_order,
          keywords: keywordsArray
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

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleCategory = (id: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      setTimeout(() => {
        categoryRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    setExpandedCategories(newSet);
  };

  const subcategoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleSubcategory = (id: string) => {
    const newSet = new Set(expandedSubcategories);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      setTimeout(() => {
        subcategoryRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
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

  const renderEditForm = (showIcon: boolean = false, showAdj: boolean = false, showFrontColor: boolean = false, showKeywords: boolean = false) => (
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
      {showKeywords && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Mots-clés / Synonymes (séparés par des virgules)</label>
          <Input
            value={editForm.keywords}
            onChange={(e) => setEditForm(prev => ({ ...prev, keywords: e.target.value }))}
            placeholder="huîtres, moules, palourdes, bigorneaux..."
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Ces mots permettront de trouver ce service lors d'une recherche</p>
        </div>
      )}
      {showFrontColor && (
        <div className="max-w-xs">
          <label className="text-xs font-medium text-muted-foreground">Couleur en front</label>
          <div className="flex gap-3 mt-1">
            {[
              { value: "white", label: "Blanc", style: "bg-white text-black border" },
              { value: "black", label: "Noir", style: "bg-black text-white border border-transparent" },
            ].map(({ value, label, style }) => (
              <button
                key={value}
                type="button"
                onClick={() => setEditForm(prev => ({ ...prev, front_color: value }))}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${style} ${
                  editForm.front_color === value ? "ring-2 ring-primary ring-offset-2" : "opacity-60 hover:opacity-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
      {editMode?.type === "category" && editMode.id === null && renderEditForm(true, true, true)}

      {/* Categories list */}
      <div className="space-y-2">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const subs = getSubcategoriesForCategory(category.id);
          const isEditing = editMode?.type === "category" && editMode.id === category.id;

          return (
            <Card key={category.id} ref={(el) => { categoryRefs.current[category.id] = el; }} style={{ scrollMarginTop: '80px' }}>
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
                  
                  <div className="flex-1 flex items-center gap-2">
                    <span className="font-medium">{category.name_fr}</span>
                    {category.name_en && (
                      <span className="text-muted-foreground text-sm">({category.name_en})</span>
                    )}
                    {category.icon && (
                      <DynamicIcon name={category.icon} className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  
                  <Badge variant="secondary">{subs.length} sous-cat.</Badge>
                  {(businessCountByCat[category.id] || 0) > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={(e) => openCategoryBusinesses(e, category.id, category.name_fr)}
                    >
                      {businessCountByCat[category.id]} entreprises
                    </Badge>
                  )}
                  
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
                </div>

                {isEditing && (
                  <div className="px-3 pb-3">
                    {renderEditForm(true, true, true)}
                  </div>
                )}

                <CollapsibleContent>
                  <div className="border-t px-3 py-2 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground">Sous-catégories</span>
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
                        <div ref={(el) => { subcategoryRefs.current[sub.id] = el; }} style={{ scrollMarginTop: '80px' }}>
                        <Collapsible key={sub.id} open={subIsExpanded} onOpenChange={() => toggleSubcategory(sub.id)}>
                          <div className="ml-4 border rounded-lg bg-background">
                            <div className="flex items-center gap-2 p-2">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1">
                                  {subIsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </Button>
                              </CollapsibleTrigger>
                              
                              <div className="flex-1 text-sm flex items-center gap-2">
                                {sub.icon && (
                                  <DynamicIcon name={sub.icon} className="h-5 w-5 text-primary" />
                                )}
                                <span className="font-bold">{sub.name_fr}</span>
                                {sub.name_en && (
                                  <span className="text-muted-foreground">({sub.name_en})</span>
                                )}
                              </div>
                              
                              <Badge variant="outline" className="text-xs">{svcs.length} services</Badge>
                              {(businessCountBySub[sub.id] || 0) > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                  onClick={(e) => openSubcategoryBusinesses(e, sub.name_fr)}
                                >
                                  {businessCountBySub[sub.id]} entreprises
                                </Badge>
                              )}
                              
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
                                  renderEditForm(true, false, false, true)
                                )}

                                {svcs.map((svc) => {
                                  const svcIsEditing = editMode?.type === "service" && editMode.id === svc.id;

                                  return (
                                    <div key={svc.id} className="ml-2">
                                      {svcIsEditing ? (
                                        renderEditForm(true, false, false, true)
                                      ) : (
                                        <div className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 group">
                                          {svc.icon && (
                                            <DynamicIcon name={svc.icon} className="h-5 w-5 text-primary" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <span className="text-xs">
                                              {svc.name_fr}
                                              {svc.name_en && (
                                                <span className="text-muted-foreground ml-1">({svc.name_en})</span>
                                              )}
                                            </span>
                                            {svc.keywords && svc.keywords.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-0.5">
                                                {svc.keywords.slice(0, 5).map((kw, i) => (
                                                  <span key={i} className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground">{kw}</span>
                                                ))}
                                                {svc.keywords.length > 5 && (
                                                  <span className="text-[9px] text-muted-foreground">+{svc.keywords.length - 5}</span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          {(businessCountBySvc[svc.id] || 0) > 0 && (
                                            <Badge
                                              variant="secondary"
                                              className="text-[10px] px-1.5 py-0.5 cursor-pointer transition-colors"
                                              style={{ backgroundColor: '#D4AF37', color: '#000' }}
                                              onClick={(e) => openServiceBusinesses(e, svc.name_fr)}
                                            >
                                              {businessCountBySvc[svc.id]} entreprise{businessCountBySvc[svc.id] > 1 ? 's' : ''}
                                            </Badge>
                                          )}
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
                        </div>
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

      {/* Businesses popup */}
      <Dialog open={!!businessesPopup} onOpenChange={(open) => !open && setBusinessesPopup(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{businessesPopup?.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 mt-2">
            {businessesPopup?.loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : businessesPopup?.businesses.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Aucune entreprise trouvée</p>
            ) : (
              <div className="space-y-1">
                {businessesPopup?.businesses.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{b.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${b.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {b.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      {b.city && <p className="text-xs text-muted-foreground">{b.city}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" asChild>
                        <Link to={`/business/${b.id}`} target="_blank">
                          <ExternalLink className="h-3 w-3" />
                          Front
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary" asChild>
                        <Link to={`/staff/backoffice?edit=${b.id}`} target="_blank">
                          <Settings className="h-3 w-3" />
                          Back
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagement;
