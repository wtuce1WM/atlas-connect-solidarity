import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit, X, Check, Loader2, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabelItem {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

const LabelManagement = () => {
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name_fr: "", name_en: "", name_ar: "", image_url: "" });
  const [newLabel, setNewLabel] = useState({ name_fr: "", name_en: "", name_ar: "", image_url: "" });
  const [showNewForm, setShowNewForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    setLoading(true);
    // Use raw query since the types.ts might not be updated yet
    const { data, error } = await supabase
      .from("labels" as any)
      .select("id, name_fr, name_en, name_ar, image_url, sort_order, created_at")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching labels:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les labels.",
      });
    } else {
      setLabels((data as unknown as LabelItem[]) || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newLabel.name_fr.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom en français est requis.",
      });
      return;
    }

    const { error } = await supabase
      .from("labels" as any)
      .insert({
        name_fr: newLabel.name_fr.trim(),
        name_en: newLabel.name_en.trim() || null,
        name_ar: newLabel.name_ar.trim() || null,
        image_url: newLabel.image_url.trim() || null,
        sort_order: labels.length,
      });

    if (error) {
      console.error("Error creating label:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer le label.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Label créé avec succès.",
      });
      setNewLabel({ name_fr: "", name_en: "", name_ar: "", image_url: "" });
      setShowNewForm(false);
      fetchLabels();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.name_fr.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom en français est requis.",
      });
      return;
    }

    const { error } = await supabase
      .from("labels" as any)
      .update({
        name_fr: editForm.name_fr.trim(),
        name_en: editForm.name_en.trim() || null,
        name_ar: editForm.name_ar.trim() || null,
        image_url: editForm.image_url.trim() || null,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating label:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le label.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Label modifié avec succès.",
      });
      setEditingId(null);
      fetchLabels();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce label ?")) {
      return;
    }

    const { error } = await supabase
      .from("labels" as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting label:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le label.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Label supprimé avec succès.",
      });
      fetchLabels();
    }
  };

  const startEdit = (label: LabelItem) => {
    setEditingId(label.id);
    setEditForm({
      name_fr: label.name_fr,
      name_en: label.name_en || "",
      name_ar: label.name_ar || "",
      image_url: label.image_url || "",
    });
  };

  const handleImageUpload = async (
    files: FileList | null,
    isNew: boolean = false
  ) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Type de fichier invalide",
        description: "Seules les images sont acceptées.",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "L'image ne doit pas dépasser 2MB.",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `label-${Date.now()}.${fileExt}`;
      const filePath = `labels/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("business-images")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        if (isNew) {
          setNewLabel((prev) => ({ ...prev, image_url: urlData.publicUrl }));
        } else {
          setEditForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
        }
        toast({
          title: "Succès",
          description: "Image uploadée avec succès.",
        });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'upload.",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Labels</h2>
          <p className="text-muted-foreground">
            Gérez les labels/certifications pouvant être attribués aux entreprises
          </p>
        </div>
        <Button
          onClick={() => setShowNewForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={showNewForm}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau label
        </Button>
      </div>

      {/* New Label Form */}
      {showNewForm && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              Nouveau label
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="new-name-fr">Nom (FR) *</Label>
                <Input
                  id="new-name-fr"
                  value={newLabel.name_fr}
                  onChange={(e) => setNewLabel({ ...newLabel, name_fr: e.target.value })}
                  placeholder="Ex: Relais & Châteaux"
                />
              </div>
              <div>
                <Label htmlFor="new-name-en">Nom (EN)</Label>
                <Input
                  id="new-name-en"
                  value={newLabel.name_en}
                  onChange={(e) => setNewLabel({ ...newLabel, name_en: e.target.value })}
                  placeholder="Ex: Relais & Châteaux"
                />
              </div>
              <div>
                <Label htmlFor="new-name-ar">Nom (AR)</Label>
                <Input
                  id="new-name-ar"
                  value={newLabel.name_ar}
                  onChange={(e) => setNewLabel({ ...newLabel, name_ar: e.target.value })}
                  placeholder="الاسم بالعربية"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label>Image du label</Label>
                <div className="mt-2 flex items-center gap-4">
                  {newLabel.image_url ? (
                    <div className="relative">
                      <img
                        src={newLabel.image_url}
                        alt="Preview"
                        className="h-16 w-16 object-contain border rounded bg-background p-1"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => setNewLabel({ ...newLabel, image_url: "" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center hover:border-primary/50 transition-colors">
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files, true)}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewForm(false);
                  setNewLabel({ name_fr: "", name_en: "", name_ar: "", image_url: "" });
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-4 w-4 mr-2" />
                Créer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Labels List */}
      <div className="grid gap-4">
        {labels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun label créé</p>
              <p className="text-sm">Cliquez sur "Nouveau label" pour en créer un.</p>
            </CardContent>
          </Card>
        ) : (
          labels.map((label) => (
            <Card key={label.id} className={cn(editingId === label.id && "ring-2 ring-primary")}>
              <CardContent className="py-4">
                {editingId === label.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Nom (FR) *</Label>
                        <Input
                          value={editForm.name_fr}
                          onChange={(e) => setEditForm({ ...editForm, name_fr: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Nom (EN)</Label>
                        <Input
                          value={editForm.name_en}
                          onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Nom (AR)</Label>
                        <Input
                          value={editForm.name_ar}
                          onChange={(e) => setEditForm({ ...editForm, name_ar: e.target.value })}
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {editForm.image_url ? (
                        <div className="relative">
                          <img
                            src={editForm.image_url}
                            alt="Preview"
                            className="h-16 w-16 object-contain border rounded bg-background p-1"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-5 w-5"
                            onClick={() => setEditForm({ ...editForm, image_url: "" })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <div className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center hover:border-primary/50 transition-colors">
                            {uploading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                              <Plus className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e.target.files, false)}
                            disabled={uploading}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                      <Button onClick={() => handleUpdate(label.id)}>
                        <Check className="h-4 w-4 mr-2" />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {label.image_url ? (
                        <img
                          src={label.image_url}
                          alt={label.name_fr}
                          className="h-12 w-12 object-contain border rounded bg-background p-1"
                        />
                      ) : (
                        <div className="h-12 w-12 border rounded bg-muted flex items-center justify-center">
                          <Award className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{label.name_fr}</p>
                        <div className="text-sm text-muted-foreground flex gap-2">
                          {label.name_en && <span>EN: {label.name_en}</span>}
                          {label.name_ar && <span dir="rtl">AR: {label.name_ar}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(label)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(label.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LabelManagement;
