import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, ExternalLink, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "./RichTextEditor";

interface CertificationMeta {
  id?: string;
  certification_name: string;
  image_url: string | null;
  link_url: string | null;
  link_title: string | null;
  description: string | null;
}

interface Props {
  certificationName: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_DESCRIPTION_LENGTH = 5000;

const CertificationMetadataDialog = ({ certificationName, onClose, onSaved }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState<CertificationMeta>({
    certification_name: "",
    image_url: null,
    link_url: null,
    link_title: null,
    description: null,
  });

  useEffect(() => {
    if (!certificationName) return;
    setLoading(true);
    supabase
      .from("certification_metadata")
      .select("*")
      .eq("certification_name", certificationName)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMeta(data as CertificationMeta);
        } else {
          setMeta({
            certification_name: certificationName,
            image_url: null,
            link_url: null,
            link_title: null,
            description: null,
          });
        }
        setLoading(false);
      });
  }, [certificationName]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier image requis");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo)");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("certification-images").upload(path, file);
    if (error) {
      toast.error("Erreur upload : " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("certification-images").getPublicUrl(path);
    setMeta((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const plainTextLength = (html: string | null) => {
    if (!html) return 0;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || "").length;
  };

  const handleSave = async () => {
    if (plainTextLength(meta.description) > MAX_DESCRIPTION_LENGTH) {
      toast.error(`Le texte dépasse ${MAX_DESCRIPTION_LENGTH} caractères`);
      return;
    }
    setSaving(true);
    const payload = {
      certification_name: meta.certification_name,
      image_url: meta.image_url || null,
      link_url: meta.link_url || null,
      link_title: meta.link_title || null,
      description: meta.description || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (meta.id) {
      ({ error } = await supabase.from("certification_metadata").update(payload).eq("id", meta.id));
    } else {
      ({ error } = await supabase.from("certification_metadata").insert(payload));
    }

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Certification mise à jour");
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  const charCount = plainTextLength(meta.description);

  return (
    <>
      {!!certificationName && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      )}
      {!!certificationName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background border rounded-xl shadow-2xl p-6 space-y-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">🏅 Certification : {certificationName}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            {/* Image */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Image</Label>
              {meta.image_url ? (
                <div className="relative inline-block">
                  <img src={meta.image_url} alt="" className="h-24 rounded-md border object-contain" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setMeta((prev) => ({ ...prev, image_url: null }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("border-primary")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-primary");
                    const file = e.dataTransfer.files[0];
                    if (file) handleImageUpload(file);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="cert-img-upload"
                    onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
                  />
                  <label htmlFor="cert-img-upload" className="cursor-pointer flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    Glissez ou cliquez pour uploader
                  </label>
                </div>
              )}
            </div>

            {/* External link */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ExternalLink className="h-4 w-4" /> Lien externe</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Titre du lien"
                  value={meta.link_title || ""}
                  onChange={(e) => setMeta((prev) => ({ ...prev, link_title: e.target.value }))}
                />
                <Input
                  placeholder="https://..."
                  value={meta.link_url || ""}
                  onChange={(e) => setMeta((prev) => ({ ...prev, link_url: e.target.value }))}
                />
              </div>
            </div>

            {/* Rich text description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description (texte riche)</Label>
                <span className={`text-xs ${charCount > MAX_DESCRIPTION_LENGTH ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                  {charCount} / {MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <RichTextEditor
                content={meta.description || ""}
                onChange={(html) => setMeta((prev) => ({ ...prev, description: html }))}
                placeholder="Description de la certification…"
                maxHeight="250px"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || charCount > MAX_DESCRIPTION_LENGTH}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        )}
          </div>
        </div>
      )}
    </>
  );
};

export default CertificationMetadataDialog;
