import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Trash2, FileText, Download } from "lucide-react";

const MAX_DOCS = 10;
const BUCKET = "affiliate-legal";

type LegalDoc = {
  id: string;
  name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type Country = { id: string; name_fr: string };

interface Props {
  affiliateId: string;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const AffiliateLegalTab = ({ affiliateId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [form, setForm] = useState({
    name: "",
    country_id: "",
    ice: "",
    vat: "",
    whatsapp: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    contact_url: "",
  });

  const load = async () => {
    const [{ data: aff }, { data: countriesData }, { data: docsData }] = await Promise.all([
      supabase.from("affiliates").select("name, country_id, ice, vat, whatsapp, contact_name, contact_phone, contact_email, contact_url").eq("id", affiliateId).maybeSingle(),
      supabase.from("countries").select("id, name_fr").order("name_fr"),
      supabase.from("affiliate_legal_documents").select("id, name, file_path, mime_type, size_bytes, created_at").eq("affiliate_id", affiliateId).order("created_at", { ascending: false }),
    ]);
    setCountries((countriesData as Country[]) || []);
    setDocs((docsData as LegalDoc[]) || []);
    if (aff) {
      setForm({
        name: aff.name || "",
        country_id: aff.country_id || "",
        ice: aff.ice || "",
        vat: (aff as any).vat || "",
        whatsapp: aff.whatsapp || "",
        contact_name: aff.contact_name || "",
        contact_phone: aff.contact_phone || "",
        contact_email: aff.contact_email || "",
        contact_url: (aff as any).contact_url || "",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliateId]);

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nom Entreprise obligatoire", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("affiliates")
      .update({
        name: form.name.trim(),
        country_id: form.country_id || null,
        ice: form.ice.slice(0, 20) || null,
        vat: form.vat.slice(0, 20) || null,
        whatsapp: form.whatsapp || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        contact_url: form.contact_url || null,
      } as any)
      .eq("id", affiliateId);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Informations enregistrées" });
  };

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (docs.length + files.length > MAX_DOCS) {
      toast({ title: `Limite de ${MAX_DOCS} documents`, description: `Il reste ${MAX_DOCS - docs.length} emplacement(s).`, variant: "destructive" });
      return;
    }
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${affiliateId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
      if (upErr) {
        toast({ title: "Échec du téléversement", description: upErr.message, variant: "destructive" });
        continue;
      }
      const { error: insErr } = await supabase.from("affiliate_legal_documents").insert({
        affiliate_id: affiliateId,
        name: file.name,
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        toast({ title: "Erreur", description: insErr.message, variant: "destructive" });
      }
    }
    setUploading(false);
    load();
  };

  const openDoc = async (doc: LegalDoc) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Fichier indisponible", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const removeDoc = async (doc: LegalDoc) => {
    const { error } = await supabase.from("affiliate_legal_documents").delete().eq("id", doc.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/60 text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  const field = (key: keyof typeof form, label: string, extra?: { type?: string; maxLength?: number }) => (
    <div className="space-y-1.5">
      <Label className="text-white/80 text-xs">{label}</Label>
      <Input
        type={extra?.type || "text"}
        value={form[key]}
        maxLength={extra?.maxLength}
        onChange={(e) => setForm({ ...form, [key]: extra?.maxLength ? e.target.value.slice(0, extra.maxLength) : e.target.value })}
        className="bg-white/10 border-white/20 text-white"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h3 className="text-white font-semibold">Informations juridiques de l'entreprise</h3>
          <p className="text-sm text-white/60">Ces informations sont rattachées à votre compte affilié.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("name", "Nom Entreprise *")}
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Pays</Label>
            <select
              value={form.country_id}
              onChange={(e) => setForm({ ...form, country_id: e.target.value })}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2"
            >
              <option value="">—</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id} className="text-neutral-900">
                  {c.name_fr}
                </option>
              ))}
            </select>
          </div>
          {field("ice", "ICE (max 20 caractères)", { maxLength: 20 })}
          {field("vat", "TVA (max 20 caractères)", { maxLength: 20 })}
          {field("whatsapp", "WhatsApp")}
          {field("contact_name", "Nom du contact")}
          {field("contact_phone", "Téléphone du contact")}
          {field("contact_email", "Email de contact", { type: "email" })}
          {field("contact_url", "Site web / URL")}
        </div>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Enregistrer
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-white font-semibold">Documents juridiques</h3>
            <p className="text-sm text-white/60">
              PDF, Excel, Word, images… {docs.length}/{MAX_DOCS} documents.
            </p>
          </div>
          <label className="inline-flex">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
              className="hidden"
              onChange={(e) => {
                upload(e.target.files);
                e.currentTarget.value = "";
              }}
              disabled={uploading || docs.length >= MAX_DOCS}
            />
            <Button type="button" asChild size="sm" disabled={uploading || docs.length >= MAX_DOCS}>
              <span>
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Ajouter un document
              </span>
            </Button>
          </label>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading && docs.length < MAX_DOCS) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (uploading || docs.length >= MAX_DOCS) return;
            upload(e.dataTransfer.files);
          }}
          className={`rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/10" : "border-white/15 bg-white/5"
          } ${uploading || docs.length >= MAX_DOCS ? "opacity-50" : ""}`}
        >
          <Upload className="h-5 w-5 mx-auto text-white/50 mb-1.5" />
          <p className="text-sm text-white/70">
            {uploading ? "Téléversement en cours…" : "Glissez-déposez vos documents ici"}
          </p>
          <p className="text-[11px] text-white/40 mt-0.5">PDF, Word, Excel, CSV, images — {MAX_DOCS - docs.length} emplacement(s) restant(s)</p>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-white/50 border border-white/10 rounded-lg p-4">Aucun document pour le moment.</p>
        ) : (

          <div className="rounded-lg border border-white/10 divide-y divide-white/5">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{d.name}</p>
                  <p className="text-[11px] text-white/40">
                    {new Date(d.created_at).toLocaleDateString("fr-FR")} {formatSize(d.size_bytes) && `· ${formatSize(d.size_bytes)}`}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => openDoc(d)} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                  <Download className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => removeDoc(d)} className="text-red-400 border-white/20 hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateLegalTab;
