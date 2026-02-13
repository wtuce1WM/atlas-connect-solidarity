import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, X, Check, Loader2, Award, Link, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabelItem {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_ar: string | null;
  url_fr: string | null;
  url_en: string | null;
  url_ar: string | null;
  image_url: string | null;
  logo_url: string | null;
  sort_order: number;
  created_at: string;
  show_on_home: boolean;
  show_on_category: boolean;
  show_on_city: boolean;
  show_on_service: boolean;
  show_on_neighborhood: boolean;
}

interface LabelBusiness {
  id: string;
  name: string;
  city: string;
}

interface LabelFormState {
  name_fr: string;
  name_en: string;
  name_ar: string;
  description_fr: string;
  description_en: string;
  description_ar: string;
  url_fr: string;
  url_en: string;
  url_ar: string;
  image_url: string;
  logo_url: string;
  show_on_home: boolean;
  show_on_category: boolean;
  show_on_city: boolean;
  show_on_service: boolean;
  show_on_neighborhood: boolean;
}

const emptyForm: LabelFormState = {
  name_fr: "",
  name_en: "",
  name_ar: "",
  description_fr: "",
  description_en: "",
  description_ar: "",
  url_fr: "",
  url_en: "",
  url_ar: "",
  image_url: "",
  logo_url: "",
  show_on_home: false,
  show_on_category: false,
  show_on_city: false,
  show_on_service: false,
  show_on_neighborhood: false,
};

const LabelManagement = () => {
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LabelFormState>(emptyForm);
  const [newLabel, setNewLabel] = useState<LabelFormState>(emptyForm);
  const [showNewForm, setShowNewForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [labelBusinesses, setLabelBusinesses] = useState<Record<string, LabelBusiness[]>>({});
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    setLoading(true);
    const [labelsRes, blRes] = await Promise.all([
      supabase
        .from("labels" as any)
        .select("id, name_fr, name_en, name_ar, description_fr, description_en, description_ar, url_fr, url_en, url_ar, image_url, logo_url, sort_order, created_at, show_on_home, show_on_category, show_on_city, show_on_service, show_on_neighborhood")
        .order("sort_order", { ascending: true }),
      supabase
        .from("business_labels")
        .select("label_id, business_id, businesses!business_labels_business_id_fkey(id, name, city)")
    ]);

    if (labelsRes.error) {
      console.error("Error fetching labels:", labelsRes.error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les labels.",
      });
    } else {
      setLabels((labelsRes.data as unknown as LabelItem[]) || []);
    }

    // Group businesses by label_id
    const grouped: Record<string, LabelBusiness[]> = {};
    ((blRes.data as any[]) || []).forEach((bl: any) => {
      const b = bl.businesses;
      if (b && bl.label_id) {
        if (!grouped[bl.label_id]) grouped[bl.label_id] = [];
        grouped[bl.label_id].push({ id: b.id, name: b.name, city: b.city });
      }
    });
    setLabelBusinesses(grouped);

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
        description_fr: newLabel.description_fr.trim() || null,
        description_en: newLabel.description_en.trim() || null,
        description_ar: newLabel.description_ar.trim() || null,
        url_fr: newLabel.url_fr.trim() || null,
        url_en: newLabel.url_en.trim() || null,
        url_ar: newLabel.url_ar.trim() || null,
        image_url: newLabel.image_url.trim() || null,
        logo_url: newLabel.logo_url.trim() || null,
        sort_order: labels.length,
        show_on_home: newLabel.show_on_home,
        show_on_category: newLabel.show_on_category,
        show_on_city: newLabel.show_on_city,
        show_on_service: newLabel.show_on_service,
        show_on_neighborhood: newLabel.show_on_neighborhood,
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
      setNewLabel(emptyForm);
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
        description_fr: editForm.description_fr.trim() || null,
        description_en: editForm.description_en.trim() || null,
        description_ar: editForm.description_ar.trim() || null,
        url_fr: editForm.url_fr.trim() || null,
        url_en: editForm.url_en.trim() || null,
        url_ar: editForm.url_ar.trim() || null,
        image_url: editForm.image_url.trim() || null,
        logo_url: editForm.logo_url.trim() || null,
        show_on_home: editForm.show_on_home,
        show_on_category: editForm.show_on_category,
        show_on_city: editForm.show_on_city,
        show_on_service: editForm.show_on_service,
        show_on_neighborhood: editForm.show_on_neighborhood,
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
      description_fr: label.description_fr || "",
      description_en: label.description_en || "",
      description_ar: label.description_ar || "",
      url_fr: label.url_fr || "",
      url_en: label.url_en || "",
      url_ar: label.url_ar || "",
      image_url: label.image_url || "",
      logo_url: label.logo_url || "",
      show_on_home: label.show_on_home,
      show_on_category: label.show_on_category,
      show_on_city: label.show_on_city,
      show_on_service: label.show_on_service,
      show_on_neighborhood: label.show_on_neighborhood,
    });
  };

  const handleImageUpload = async (
    files: FileList | null,
    isNew: boolean = false,
    field: "image_url" | "logo_url" = "image_url"
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
          setNewLabel((prev) => ({ ...prev, [field]: urlData.publicUrl }));
        } else {
          setEditForm((prev) => ({ ...prev, [field]: urlData.publicUrl }));
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

  const renderFormFields = (
    form: LabelFormState,
    setForm: (form: LabelFormState) => void,
    isNew: boolean
  ) => (
    <div className="space-y-4">
      {/* Names */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor={isNew ? "new-name-fr" : "edit-name-fr"}>Nom (FR) *</Label>
          <Input
            id={isNew ? "new-name-fr" : "edit-name-fr"}
            value={form.name_fr}
            onChange={(e) => setForm({ ...form, name_fr: e.target.value })}
            placeholder="Ex: Relais & Châteaux"
          />
        </div>
        <div>
          <Label htmlFor={isNew ? "new-name-en" : "edit-name-en"}>Nom (EN)</Label>
          <Input
            id={isNew ? "new-name-en" : "edit-name-en"}
            value={form.name_en}
            onChange={(e) => setForm({ ...form, name_en: e.target.value })}
            placeholder="Ex: Relais & Châteaux"
          />
        </div>
        <div>
          <Label htmlFor={isNew ? "new-name-ar" : "edit-name-ar"}>Nom (AR)</Label>
          <Input
            id={isNew ? "new-name-ar" : "edit-name-ar"}
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            placeholder="الاسم بالعربية"
            dir="rtl"
          />
        </div>
      </div>

      {/* Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor={isNew ? "new-desc-fr" : "edit-desc-fr"}>Description (FR)</Label>
          <Input
            id={isNew ? "new-desc-fr" : "edit-desc-fr"}
            value={form.description_fr}
            onChange={(e) => setForm({ ...form, description_fr: e.target.value })}
            placeholder="Découvrez les établissements..."
          />
        </div>
        <div>
          <Label htmlFor={isNew ? "new-desc-en" : "edit-desc-en"}>Description (EN)</Label>
          <Input
            id={isNew ? "new-desc-en" : "edit-desc-en"}
            value={form.description_en}
            onChange={(e) => setForm({ ...form, description_en: e.target.value })}
            placeholder="Discover the establishments..."
          />
        </div>
        <div>
          <Label htmlFor={isNew ? "new-desc-ar" : "edit-desc-ar"}>Description (AR)</Label>
          <Input
            id={isNew ? "new-desc-ar" : "edit-desc-ar"}
            value={form.description_ar}
            onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
            placeholder="اكتشف المؤسسات..."
            dir="rtl"
          />
        </div>
      </div>

      {/* URLs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor={isNew ? "new-url-fr" : "edit-url-fr"} className="flex items-center gap-1">
            <Link className="h-3 w-3" /> URL (FR)
          </Label>
          <Input
            id={isNew ? "new-url-fr" : "edit-url-fr"}
            value={form.url_fr}
            onChange={(e) => setForm({ ...form, url_fr: e.target.value })}
            placeholder="https://..."
            type="url"
          />
        </div>
        <div>
          <Label htmlFor={isNew ? "new-url-en" : "edit-url-en"} className="flex items-center gap-1">
            <Link className="h-3 w-3" /> URL (EN)
          </Label>
          <Input
            id={isNew ? "new-url-en" : "edit-url-en"}
            value={form.url_en}
            onChange={(e) => setForm({ ...form, url_en: e.target.value })}
            placeholder="https://..."
            type="url"
          />
        </div>
        <div>
          <Label htmlFor={isNew ? "new-url-ar" : "edit-url-ar"} className="flex items-center gap-1">
            <Link className="h-3 w-3" /> URL (AR)
          </Label>
          <Input
            id={isNew ? "new-url-ar" : "edit-url-ar"}
            value={form.url_ar}
            onChange={(e) => setForm({ ...form, url_ar: e.target.value })}
            placeholder="https://..."
            type="url"
            dir="rtl"
          />
        </div>
      </div>

      {/* Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Image / Icône du label</Label>
          <div className="mt-2 flex items-center gap-4">
            {form.image_url ? (
              <div className="relative">
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="h-16 w-16 object-contain border rounded bg-background p-1"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5"
                  onClick={() => setForm({ ...form, image_url: "" })}
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
                  onChange={(e) => handleImageUpload(e.target.files, isNew, "image_url")}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <Label>Logo du label</Label>
          <div className="mt-2 flex items-center gap-4">
            {form.logo_url ? (
              <div className="relative">
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  className="h-16 object-contain border rounded bg-background p-1"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5"
                  onClick={() => setForm({ ...form, logo_url: "" })}
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
                  onChange={(e) => handleImageUpload(e.target.files, isNew, "logo_url")}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Visibility toggles */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Afficher sur les pages</Label>
        <div className="flex flex-wrap gap-4">
          {[
            { key: "show_on_home" as const, label: "Accueil" },
            { key: "show_on_category" as const, label: "Catégories" },
            { key: "show_on_city" as const, label: "Villes" },
            { key: "show_on_service" as const, label: "Services" },
            { key: "show_on_neighborhood" as const, label: "Quartiers" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`${isNew ? "new" : "edit"}-${key}`}
                checked={form[key]}
                onCheckedChange={(checked) => setForm({ ...form, [key]: !!checked })}
              />
              <Label htmlFor={`${isNew ? "new" : "edit"}-${key}`} className="text-sm cursor-pointer">{label}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
            {renderFormFields(newLabel, setNewLabel, true)}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewForm(false);
                  setNewLabel(emptyForm);
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
                    {renderFormFields(editForm, setEditForm, false)}

                    <div className="flex justify-end gap-2 pt-2">
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
                  <div>
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
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                            {label.name_en && <span>EN: {label.name_en}</span>}
                            {label.name_ar && <span dir="rtl">AR: {label.name_ar}</span>}
                          </div>
                          {(label.url_fr || label.url_en || label.url_ar) && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Link className="h-3 w-3" />
                              <span>URL configurées</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const businesses = labelBusinesses[label.id] || [];
                          const count = businesses.length;
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-muted-foreground"
                              onClick={() => {
                                setExpandedLabels(prev => {
                                  const next = new Set(prev);
                                  if (next.has(label.id)) next.delete(label.id); else next.add(label.id);
                                  return next;
                                });
                              }}
                              disabled={count === 0}
                            >
                              <Badge variant="outline" className="text-xs">{count}</Badge>
                              {count > 0 && (
                                expandedLabels.has(label.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          );
                        })()}
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
                    {expandedLabels.has(label.id) && (labelBusinesses[label.id] || []).length > 0 && (
                      <div className="mt-3 ml-16 border-t pt-3 space-y-1">
                        {(labelBusinesses[label.id] || []).map((b) => (
                          <div key={b.id} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-sm">
                              {b.name} <span className="text-muted-foreground">— {b.city}</span>
                            </span>
                            <a
                              href={`/business/${b.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Voir fiche
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
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
