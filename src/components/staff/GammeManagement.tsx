import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, ExternalLink, Layers } from "lucide-react";

interface GammeBusiness {
  id: string;
  name: string;
  city: string;
  gamme_id: string;
}

interface Category {
  id: string;
  name_fr: string;
}

interface Gamme {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  description: string | null;
  sort_order: number | null;
  color_hex: string | null;
  text_color_hex: string | null;
}

interface GammeCategory {
  gamme_id: string;
  category_id: string;
}

interface GammeManagementProps {
  onEditBusiness?: (id: string) => void;
}

const GammeManagement = ({ onEditBusiness }: GammeManagementProps) => {
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [gammeCategories, setGammeCategories] = useState<GammeCategory[]>([]);
  const [gammeCounts, setGammeCounts] = useState<Record<string, number>>({});
  const [gammeBusinesses, setGammeBusinesses] = useState<Record<string, GammeBusiness[]>>({});
  const [expandedGammes, setExpandedGammes] = useState<Set<string>>(new Set());
  const gammeRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGamme, setEditingGamme] = useState<Gamme | null>(null);
  const [formData, setFormData] = useState({
    name_fr: "",
    name_en: "",
    name_ar: "",
    description: "",
    sort_order: 0,
    color_hex: "#000000",
    text_color_hex: "#000000",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sectionOpen, setSectionOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [gammesRes, categoriesRes, gammeCategoriesRes, businessesRes] = await Promise.all([
      supabase.from("gammes").select("*").order("sort_order", { ascending: true }),
      supabase.from("categories").select("id, name_fr").order("name_fr", { ascending: true }),
      supabase.from("gamme_categories").select("gamme_id, category_id"),
      supabase.from("businesses").select("id, name, city, gamme_id").not("gamme_id", "is", null),
    ]);

    if (gammesRes.error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les gammes.",
      });
    } else {
      setGammes(gammesRes.data || []);
    }

    setCategories(categoriesRes.data || []);
    setGammeCategories(gammeCategoriesRes.data || []);
    
    const counts: Record<string, number> = {};
    const grouped: Record<string, GammeBusiness[]> = {};
    (businessesRes.data || []).forEach((b: any) => {
      if (b.gamme_id) {
        counts[b.gamme_id] = (counts[b.gamme_id] || 0) + 1;
        if (!grouped[b.gamme_id]) grouped[b.gamme_id] = [];
        grouped[b.gamme_id].push(b);
      }
    });
    setGammeCounts(counts);
    setGammeBusinesses(grouped);
    
    setLoading(false);
  };

  const getCategoriesForGamme = (gammeId: string): string[] => {
    return gammeCategories
      .filter((gc) => gc.gamme_id === gammeId)
      .map((gc) => gc.category_id);
  };

  const getCategoryNames = (gammeId: string): string[] => {
    const categoryIds = getCategoriesForGamme(gammeId);
    return categories
      .filter((c) => categoryIds.includes(c.id))
      .map((c) => c.name_fr);
  };

  const resetForm = () => {
    setFormData({
      name_fr: "",
      name_en: "",
      name_ar: "",
      description: "",
      sort_order: gammes.length,
      color_hex: "#000000",
      text_color_hex: "#000000",
    });
    setSelectedCategories([]);
    setEditingGamme(null);
  };

  const handleOpenDialog = (gamme?: Gamme) => {
    if (gamme) {
      setEditingGamme(gamme);
      setFormData({
        name_fr: gamme.name_fr,
        name_en: gamme.name_en || "",
        name_ar: gamme.name_ar || "",
        description: gamme.description || "",
        sort_order: gamme.sort_order || 0,
        color_hex: gamme.color_hex || "#000000",
        text_color_hex: gamme.text_color_hex || "#000000",
      });
      setSelectedCategories(getCategoriesForGamme(gamme.id));
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name_fr.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom en français est obligatoire.",
      });
      return;
    }

    const gammeData = {
      name_fr: formData.name_fr.trim(),
      name_en: formData.name_en.trim() || null,
      name_ar: formData.name_ar.trim() || null,
      description: formData.description.trim() || null,
      sort_order: formData.sort_order,
      color_hex: formData.color_hex || null,
      text_color_hex: formData.text_color_hex || null,
    };

    let gammeId: string;

    if (editingGamme) {
      const { error } = await supabase
        .from("gammes")
        .update(gammeData)
        .eq("id", editingGamme.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de modifier la gamme.",
        });
        return;
      }
      gammeId = editingGamme.id;

      await supabase
        .from("gamme_categories")
        .delete()
        .eq("gamme_id", gammeId);
    } else {
      const { data, error } = await supabase
        .from("gammes")
        .insert(gammeData)
        .select()
        .single();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de créer la gamme.",
        });
        return;
      }
      gammeId = data.id;
    }

    if (selectedCategories.length > 0) {
      const associations = selectedCategories.map((categoryId) => ({
        gamme_id: gammeId,
        category_id: categoryId,
      }));

      const { error: assocError } = await supabase
        .from("gamme_categories")
        .insert(associations);

      if (assocError) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible d'associer les catégories.",
        });
        return;
      }
    }

    toast({
      title: "Succès",
      description: editingGamme
        ? "Gamme modifiée avec succès."
        : "Gamme créée avec succès.",
    });
    setIsDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette gamme ?")) {
      return;
    }

    const { error } = await supabase.from("gammes").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la gamme. Elle est peut-être utilisée par des entreprises.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Gamme supprimée avec succès.",
      });
      fetchData();
    }
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setSectionOpen(!sectionOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Gammes ({gammes.length})
            <ChevronDown className={`h-4 w-4 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </CardTitle>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenDialog(); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle gamme
          </Button>
        </div>
      </CardHeader>

      {sectionOpen && <CardContent>
        <div className="space-y-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingGamme ? "Modifier la gamme" : "Nouvelle gamme"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_fr">Nom (FR) *</Label>
                    <Input
                      id="name_fr"
                      value={formData.name_fr}
                      onChange={(e) =>
                        setFormData({ ...formData, name_fr: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name_en">Nom (EN)</Label>
                      <Input
                        id="name_en"
                        value={formData.name_en}
                        onChange={(e) =>
                          setFormData({ ...formData, name_en: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name_ar">Nom (AR)</Label>
                      <Input
                        id="name_ar"
                        value={formData.name_ar}
                        onChange={(e) =>
                          setFormData({ ...formData, name_ar: e.target.value })
                        }
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sort_order">Ordre</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sort_order: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color_hex">Couleur fond</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color_hex"
                          type="color"
                          value={formData.color_hex}
                          onChange={(e) =>
                            setFormData({ ...formData, color_hex: e.target.value })
                          }
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={formData.color_hex}
                          onChange={(e) =>
                            setFormData({ ...formData, color_hex: e.target.value })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="text_color_hex">Couleur texte</Label>
                      <div className="flex gap-2">
                        <Input
                          id="text_color_hex"
                          type="color"
                          value={formData.text_color_hex}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              text_color_hex: e.target.value,
                            })
                          }
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={formData.text_color_hex}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              text_color_hex: e.target.value,
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Catégories associées</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`cat-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() =>
                              handleCategoryToggle(category.id)
                            }
                          />
                          <Label
                            htmlFor={`cat-${category.id}`}
                            className="text-sm"
                          >
                            {category.name_fr}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label>Aperçu :</Label>
                    <Badge
                      style={{
                        backgroundColor: formData.color_hex,
                        color: formData.text_color_hex,
                      }}
                    >
                      {formData.name_fr || "Gamme"}
                    </Badge>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingGamme ? "Modifier" : "Créer"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Aperçu</TableHead>
                  <TableHead>Catégories</TableHead>
                  <TableHead className="text-center">Établ.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gammes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Aucune gamme créée
                    </TableCell>
                  </TableRow>
                ) : (
                  gammes.map((gamme) => {
                    const catNames = getCategoryNames(gamme.id);
                    const count = gammeCounts[gamme.id] || 0;
                    const isExpanded = expandedGammes.has(gamme.id);
                    const businesses = gammeBusinesses[gamme.id] || [];
                    return (
                      <React.Fragment key={gamme.id}>
                        <TableRow ref={(el) => { gammeRefs.current[gamme.id] = el; }}>
                          <TableCell className="text-muted-foreground">
                            {gamme.sort_order}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{gamme.name_fr}</p>
                              {gamme.name_en && (
                                <p className="text-xs text-muted-foreground">
                                  EN: {gamme.name_en}
                                </p>
                              )}
                              {gamme.name_ar && (
                                <p className="text-xs text-muted-foreground" dir="rtl">
                                  AR: {gamme.name_ar}
                                </p>
                              )}
                              {gamme.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {gamme.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: gamme.color_hex || "#000",
                                color: gamme.text_color_hex || "#fff",
                              }}
                            >
                              {gamme.name_fr}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {catNames.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">
                                  Aucune
                                </span>
                              ) : (
                                catNames.map((name) => (
                                  <Badge key={name} variant="outline" className="text-xs">
                                    {name}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant={count > 0 ? "outline" : "ghost"}
                              size="sm"
                              className="gap-1"
                              disabled={count === 0}
                              onClick={() => {
                                setExpandedGammes(prev => {
                                  const next = new Set(prev);
                                  if (next.has(gamme.id)) next.delete(gamme.id);
                                  else next.add(gamme.id);
                                  return next;
                                });
                              }}
                            >
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              {count}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleOpenDialog(gamme)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(gamme.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && businesses.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 px-8 py-3">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  {businesses.length} établissement{businesses.length > 1 ? "s" : ""} :
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                                  {businesses
                                    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                                    .map(biz => (
                                      <div key={biz.id} className="flex items-center gap-2 text-sm">
                                        <span className="truncate">{biz.name}</span>
                                        {biz.city && <span className="text-xs text-muted-foreground">({biz.city})</span>}
                                        {onEditBusiness && (
                                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onEditBusiness(biz.id)}>
                                            <ExternalLink className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>}
    </Card>
  );
};

export default GammeManagement;
