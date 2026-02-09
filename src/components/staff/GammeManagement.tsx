import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";

interface Gamme {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  description: string | null;
  sort_order: number | null;
}

const GammeManagement = () => {
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGamme, setEditingGamme] = useState<Gamme | null>(null);
  const [formData, setFormData] = useState({
    name_fr: "",
    name_en: "",
    name_ar: "",
    description: "",
    sort_order: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGammes();
  }, []);

  const fetchGammes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gammes")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les gammes.",
      });
    } else {
      setGammes(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name_fr: "",
      name_en: "",
      name_ar: "",
      description: "",
      sort_order: gammes.length,
    });
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
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
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
    };

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
      } else {
        toast({
          title: "Succès",
          description: "Gamme modifiée avec succès.",
        });
        setIsDialogOpen(false);
        fetchGammes();
      }
    } else {
      const { error } = await supabase.from("gammes").insert(gammeData);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de créer la gamme.",
        });
      } else {
        toast({
          title: "Succès",
          description: "Gamme créée avec succès.",
        });
        setIsDialogOpen(false);
        fetchGammes();
      }
    }
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
      fetchGammes();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Gammes</h2>
          <p className="text-muted-foreground">
            Gérez les gammes (Luxe, Premium, Standard, etc.) pour classifier les entreprises.
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
          <DialogContent className="max-w-md">
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description de la gamme..."
                  rows={3}
                />
              </div>

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
                />
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
              <TableHead>Nom (FR)</TableHead>
              <TableHead>Nom (EN)</TableHead>
              <TableHead>Nom (AR)</TableHead>
              <TableHead>Description</TableHead>
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
                  <TableCell className="font-medium">{gamme.name_fr}</TableCell>
                  <TableCell>{gamme.name_en || "-"}</TableCell>
                  <TableCell dir="rtl">{gamme.name_ar || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {gamme.description || "-"}
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
