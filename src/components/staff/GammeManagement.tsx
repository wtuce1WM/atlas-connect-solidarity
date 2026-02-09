import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";

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
}

interface GammeCategory {
  gamme_id: string;
  category_id: string;
}

const GammeManagement = () => {
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [gammeCategories, setGammeCategories] = useState<GammeCategory[]>([]);
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
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [gammesRes, categoriesRes, gammeCategoriesRes] = await Promise.all([
      supabase.from("gammes").select("*").order("sort_order", { ascending: true }),
      supabase.from("categories").select("id, name_fr").order("name_fr", { ascending: true }),
      supabase.from("gamme_categories").select("gamme_id, category_id"),
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

      // Delete existing category associations
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

    // Insert category associations
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Gammes</h2>
          <p className="text-muted-foreground">
            Gérez les gammes (Luxe, Premium, Standard, etc.) et leurs catégories associées.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle gamme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGamme ? "Modifier la gamme" : "Nouvelle gamme"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name_fr">Nom (Français) *</Label>
                <Input
                  id="name_fr"
                  value={formData.name_fr}
                  onChange={(e) =>
                    setFormData({ ...formData, name_fr: e.target.value })
                  }
                  placeholder="Ex: Premium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_en">Nom (Anglais)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) =>
                      setFormData({ ...formData, name_en: e.target.value })
                    }
                    placeholder="Ex: Premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_ar">Nom (Arabe)</Label>
                  <Input
                    id="name_ar"
                    value={formData.name_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ar: e.target.value })
                    }
                    placeholder="الفاخرة"
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
                  placeholder="Description de la gamme..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Ordre d'affichage</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    className="w-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color_hex">Couleur</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="color_hex"
                      type="color"
                      value={formData.color_hex}
                      onChange={(e) =>
                        setFormData({ ...formData, color_hex: e.target.value })
                      }
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={formData.color_hex}
                      onChange={(e) =>
                        setFormData({ ...formData, color_hex: e.target.value })
                      }
                      placeholder="#000000"
                      className="w-28 font-mono text-sm"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              {/* Categories selection */}
              <div className="space-y-3">
                <Label>Catégories associées</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucune catégorie disponible</p>
                  ) : (
                    categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                        <label
                          htmlFor={`cat-${category.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {category.name_fr}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedCategories.length} catégorie(s) sélectionnée(s)
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" className="bg-gold hover:bg-gold/90">
                  {editingGamme ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="bg-background rounded-lg p-4 border inline-block">
        <p className="text-2xl font-bold">{gammes.length}</p>
        <p className="text-muted-foreground text-sm">Gammes définies</p>
      </div>

      {/* Table */}
      <div className="bg-background rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Ordre</TableHead>
              <TableHead>Couleur</TableHead>
              <TableHead>Nom (FR)</TableHead>
              <TableHead>Nom (EN)</TableHead>
              <TableHead>Catégories associées</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : gammes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Aucune gamme définie.
                </TableCell>
              </TableRow>
            ) : (
              gammes.map((gamme) => (
                <TableRow key={gamme.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {gamme.sort_order}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div 
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: gamme.color_hex || '#000000' }}
                      title={gamme.color_hex || '#000000'}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{gamme.name_fr}</TableCell>
                  <TableCell>{gamme.name_en || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getCategoryNames(gamme.id).length > 0 ? (
                        getCategoryNames(gamme.id).map((name) => (
                          <Badge key={name} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">Aucune</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(gamme)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(gamme.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GammeManagement;
