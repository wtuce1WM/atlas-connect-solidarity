import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  X,
  Image as ImageIcon,
  GripVertical,
  Save,
  FileText,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type DocType = "menu" | "flipbook" | "external_link";

interface DocEntry {
  _uid: string;
  id: string | null;
  url: string;
  name: string;
  language: string;
  icon: string;
  image_url: string;
  description: string;
  force_external: boolean;
}

const DOC_ICON_OPTIONS = [
  { key: "", label: "⊘ Aucune", file: "" },
  { key: "icon_menu", label: "🍽️ Menu", file: "icon_menu.png" },
  { key: "icon_wine", label: "🍷 Vins", file: "icon_wine.png" },
  { key: "icon_cocktails", label: "🍸 Cocktails", file: "icon_cocktails.avif" },
  { key: "icon_cocktails2", label: "🍹 Cocktails 2", file: "icon_cocktails2.png" },
];

const getDocIconSrc = (icon: string) => {
  if (!icon) return "";
  if (/^https?:\/\//i.test(icon)) return icon;
  const found = DOC_ICON_OPTIONS.find((o) => o.key === icon);
  return `/images/doc-icons/${found?.file || "icon_menu.png"}`;
};

const LANGUAGE_OPTIONS = [
  { code: "ar", label: "🇲🇦 AR" },
  { code: "ar-std", label: "ض AR" },
  { code: "fr", label: "🇫🇷 FR" },
  { code: "en", label: "🇬🇧 EN" },
  { code: "es", label: "🇪🇸 ES" },
  { code: "de", label: "🇩🇪 DE" },
  { code: "it", label: "🇮🇹 IT" },
  { code: "pt", label: "🇵🇹 PT" },
  { code: "nl", label: "🇳🇱 NL" },
  { code: "zh", label: "🇨🇳 ZH" },
  { code: "ja", label: "🇯🇵 JA" },
  { code: "ru", label: "🇷🇺 RU" },
];

const SECTION_OPTIONS = [
  { value: "presse", label: "Presse" },
  { value: "media", label: "Media" },
  { value: "partenaires", label: "Partenaires" },
  { value: "recompenses", label: "Récompenses" },
  { value: "certifications", label: "Certifications" },
  { value: "en_savoir_plus", label: "En savoir plus" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyDoc = (description = ""): DocEntry => ({
  _uid: uid(),
  id: null,
  url: "",
  name: "",
  language: "",
  icon: "",
  image_url: "",
  description,
  force_external: false,
});

const SortableRow = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 flex-wrap rounded-lg border border-white/10 bg-white/5 p-2 ${isDragging ? "opacity-60" : ""}`}
    >
      <button type="button" className="shrink-0 cursor-grab text-white/40 hover:text-white/70" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
};

interface Props {
  businessId: string;
}

const AffiliateExternalDocsEditor = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menus, setMenus] = useState<DocEntry[]>([]);
  const [flipbooks, setFlipbooks] = useState<DocEntry[]>([]);
  const [externals, setExternals] = useState<DocEntry[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("business_documents")
        .select("*")
        .eq("business_id", businessId)
        .in("type", ["menu", "flipbook", "external_link"])
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const map = (rows: any[]): DocEntry[] =>
        rows.map((d) => ({
          _uid: d.id,
          id: d.id,
          url: d.url || "",
          name: d.name || "",
          language: d.language || "",
          icon: d.icon || "",
          // Les liens externes stockent leur logo dans la colonne `icon`
          image_url: d.type === "external_link" ? d.icon || "" : "",
          description: d.description || "",
          force_external: !!d.force_external,
        }));
      const all = (data || []) as any[];
      setMenus(map(all.filter((d) => d.type === "menu")));
      setFlipbooks(map(all.filter((d) => d.type === "flipbook")));
      setExternals(map(all.filter((d) => d.type === "external_link")));
      setInitialIds(all.map((d) => d.id));
      setLoading(false);
    };
    if (businessId) load();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const uploadToBusinessImages = useCallback(
    async (file: File, prefix: string, maxMb: number): Promise<string | null> => {
      if (file.size > maxMb * 1024 * 1024) {
        toast({ variant: "destructive", title: `Max ${maxMb}MB` });
        return null;
      }
      const ext = file.name.split(".").pop() || "bin";
      const path = `businesses/affiliate-docs/${businessId}-${prefix}-${Date.now()}-${uid()}.${ext}`;
      const { error } = await supabase.storage.from("business-images").upload(path, file);
      if (error) {
        toast({ variant: "destructive", title: "Erreur d'upload", description: error.message });
        return null;
      }
      const { data } = supabase.storage.from("business-images").getPublicUrl(path);
      return data?.publicUrl || null;
    },
    [businessId, toast]
  );

  const handleSave = async () => {
    if (loading) return;
    setSaving(true);
    try {
      const groups: { type: DocType; rows: DocEntry[] }[] = [
        { type: "menu", rows: menus },
        { type: "flipbook", rows: flipbooks },
        { type: "external_link", rows: externals },
      ];

      const keptIds = new Set(
        groups.flatMap((g) => g.rows.map((r) => r.id).filter(Boolean) as string[])
      );
      const toDelete = initialIds.filter((id) => !keptIds.has(id));
      if (toDelete.length > 0) {
        const { error } = await supabase.from("business_documents").delete().in("id", toDelete);
        if (error) throw error;
      }

      for (const { type, rows } of groups) {
        for (let i = 0; i < rows.length; i++) {
          const d = rows[i];
          const isExternal = type === "external_link";
          if (isExternal ? !d.name.trim() : !d.url.trim()) continue;
          const payload: any = {
            business_id: businessId,
            type,
            url: d.url.trim(),
            name: d.name || null,
            language: d.language || null,
            icon: isExternal ? d.image_url || null : d.icon || null,
            description: isExternal ? d.description || "presse" : null,
            force_external: d.force_external,
            sort_order: i,
          };
          if (d.id) {
            const { error } = await supabase.from("business_documents").update(payload).eq("id", d.id);
            if (error) throw error;
          } else {
            const { data, error } = await supabase
              .from("business_documents")
              .insert(payload)
              .select("id")
              .maybeSingle();
            if (error) throw error;
            if (data?.id) d.id = data.id;
          }
        }
      }

      setInitialIds(
        groups.flatMap((g) => g.rows.map((r) => r.id).filter(Boolean) as string[])
      );
      toast({ title: "Liens externes enregistrés ✓" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const makeDragEnd =
    (setter: React.Dispatch<React.SetStateAction<DocEntry[]>>) => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setter((prev) => {
        const oldIdx = prev.findIndex((d) => d._uid === active.id);
        const newIdx = prev.findIndex((d) => d._uid === over.id);
        return oldIdx === -1 || newIdx === -1 ? prev : arrayMove(prev, oldIdx, newIdx);
      });
    };

  const patch = (
    setter: React.Dispatch<React.SetStateAction<DocEntry[]>>,
    idx: number,
    values: Partial<DocEntry>
  ) => setter((prev) => prev.map((d, i) => (i === idx ? { ...d, ...values } : d)));

  const langSelect = (
    value: string,
    onChange: (v: string) => void
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 shrink-0 rounded-md border border-white/15 bg-background px-2 text-sm w-24"
    >
      <option value="">Langue</option>
      {LANGUAGE_OPTIONS.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
  const EXTERNAL_TITLES: Record<string, string> = {
    presse: "Ils parlent de nous",
    media: "Ils parlent de nous",
    partenaires: "Ils nous font confiance",
    recompenses: "Nous sommes reconnus par :",
    certifications: "Nous sommes certifiés par :",
    en_savoir_plus: "En savoir plus",
  };
  const derivedExternalTitle =
    EXTERNAL_TITLES[(externals[0]?.description || "").toLowerCase()] || "+ d'infos";


  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Menus */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold text-white">🍽️ Menu (URL / PDF)</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setMenus((p) => [...p, emptyDoc()])}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        <DndContext collisionDetection={closestCenter} onDragEnd={makeDragEnd(setMenus)}>
          <SortableContext items={menus.map((d) => d._uid)} strategy={verticalListSortingStrategy}>
            {menus.map((doc, idx) => (
              <SortableRow key={doc._uid} id={doc._uid}>
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <Switch
                    checked={doc.force_external}
                    onCheckedChange={(c) => patch(setMenus, idx, { force_external: c })}
                    title="Ouvrir en lien externe"
                  />
                  {doc.force_external && (
                    <span className="text-[10px] leading-none text-orange-500">⚡ Lien externe activé</span>
                  )}
                </div>
                <div className="relative shrink-0">
                  {doc.icon ? (
                    <img src={getDocIconSrc(doc.icon)} alt="" className="h-9 w-9 rounded border border-white/15 object-contain p-0.5" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded border border-dashed border-white/20 text-xs text-white/40">⊘</div>
                  )}
                  <select
                    value={doc.icon}
                    onChange={(e) => patch(setMenus, idx, { icon: e.target.value })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  >
                    {DOC_ICON_OPTIONS.map(({ key, label }) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex min-w-[220px] flex-1 items-center gap-1">
                  {doc.url && doc.url.includes("/business-images/") ? (
                    <div className="flex h-9 flex-1 items-center gap-1 truncate rounded-md border border-white/15 bg-white/5 px-2 text-xs text-white/80">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{doc.url.split("/").pop()}</span>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-white/50 hover:text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button type="button" className="shrink-0 text-destructive" title="Retirer le fichier" onClick={() => patch(setMenus, idx, { url: "" })}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={doc.url}
                        onChange={(e) => patch(setMenus, idx, { url: e.target.value })}
                        placeholder="https://... ou uploadez un PDF/image"
                        className="flex-1 text-xs"
                      />
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-white/50 hover:text-white">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </>
                  )}
                  <label className="shrink-0 cursor-pointer" title="Uploader un PDF ou une image">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadToBusinessImages(file, "menu", 10);
                        if (url) patch(setMenus, idx, { url });
                        e.target.value = "";
                      }}
                    />
                    <Upload className="h-4 w-4 text-white/50 transition-colors hover:text-primary" />
                  </label>
                </div>
                <Input
                  value={doc.name}
                  onChange={(e) => patch(setMenus, idx, { name: e.target.value })}
                  placeholder="Nom"
                  className="w-40 shrink-0 text-xs"
                />
                {langSelect(doc.language, (v) => patch(setMenus, idx, { language: v }))}
                <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2 text-destructive hover:text-destructive" onClick={() => setMenus((p) => p.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </SortableRow>
            ))}
          </SortableContext>
        </DndContext>
        {menus.length === 0 && <p className="text-xs text-white/50">Aucun menu ajouté.</p>}
      </section>

      {/* Flipbooks */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold text-white">📖 Flipbook (Issuu, Calaméo…)</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setFlipbooks((p) => [...p, emptyDoc()])}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        <DndContext collisionDetection={closestCenter} onDragEnd={makeDragEnd(setFlipbooks)}>
          <SortableContext items={flipbooks.map((d) => d._uid)} strategy={verticalListSortingStrategy}>
            {flipbooks.map((doc, idx) => (
              <SortableRow key={doc._uid} id={doc._uid}>
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <Switch
                    checked={doc.force_external}
                    onCheckedChange={(c) => patch(setFlipbooks, idx, { force_external: c })}
                    title="Ouvrir en lien externe"
                  />
                  {doc.force_external && (
                    <span className="text-[10px] leading-none text-orange-500">⚡ Lien externe activé</span>
                  )}
                </div>
                <div className="group relative shrink-0">
                  {doc.icon ? (
                    <>
                      <img src={getDocIconSrc(doc.icon)} alt="" className="h-9 w-9 rounded border border-white/15 object-contain p-0.5" />
                      <button
                        type="button"
                        title="Supprimer l'image"
                        onClick={() => patch(setFlipbooks, idx, { icon: "" })}
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] leading-none text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-dashed border-white/20 text-white/50 transition-colors hover:border-primary hover:text-primary" title="Uploader une image">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = await uploadToBusinessImages(file, "flipbook-icon", 2);
                          if (url) patch(setFlipbooks, idx, { icon: url });
                          e.target.value = "";
                        }}
                      />
                      <Upload className="h-4 w-4" />
                    </label>
                  )}
                </div>
                <div className="flex min-w-[220px] flex-1 items-center gap-1">
                  <Input
                    value={doc.url}
                    onChange={(e) => patch(setFlipbooks, idx, { url: e.target.value })}
                    placeholder="https://issuu.com/username/docs/document-name"
                    className="flex-1 text-xs"
                  />
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-white/50 hover:text-white">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <Input
                  value={doc.name}
                  onChange={(e) => patch(setFlipbooks, idx, { name: e.target.value })}
                  placeholder="Nom"
                  className="w-40 shrink-0 text-xs"
                />
                {langSelect(doc.language, (v) => patch(setFlipbooks, idx, { language: v }))}
                <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2 text-destructive hover:text-destructive" onClick={() => setFlipbooks((p) => p.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </SortableRow>
            ))}
          </SortableContext>
        </DndContext>
        {flipbooks.length === 0 && <p className="text-xs text-white/50">Aucun flipbook ajouté.</p>}
        <p className="text-xs text-white/50">Collez l'URL de la publication Issuu ou Calaméo. Elle sera intégrée dans le panneau de l'établissement.</p>
      </section>

      {/* External links */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold text-white">🔗 Liens Externes</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setExternals((p) => [...p, emptyDoc("presse")])}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        <DndContext collisionDetection={closestCenter} onDragEnd={makeDragEnd(setExternals)}>
          <SortableContext items={externals.map((d) => d._uid)} strategy={verticalListSortingStrategy}>
            {externals.map((doc, idx) => (
              <SortableRow key={doc._uid} id={doc._uid}>
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <Switch
                    checked={doc.force_external}
                    onCheckedChange={(c) => patch(setExternals, idx, { force_external: c })}
                    title="Ouvrir en lien externe"
                  />
                  {doc.force_external && (
                    <span className="text-[10px] leading-none text-orange-500">⚡ Lien externe activé</span>
                  )}
                </div>
                <div className="group relative shrink-0">
                  <label className="block cursor-pointer">
                    {doc.image_url ? (
                      <img src={doc.image_url} alt="" className="h-9 w-9 rounded border border-white/15 object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded border border-dashed border-white/20 bg-white/5">
                        <ImageIcon className="h-4 w-4 text-white/50" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadToBusinessImages(file, "extlink", 2);
                        if (url) patch(setExternals, idx, { image_url: url });
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {doc.image_url && (
                    <button
                      type="button"
                      onClick={() => patch(setExternals, idx, { image_url: "" })}
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      title="Supprimer l'image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Input
                  value={doc.name}
                  onChange={(e) => patch(setExternals, idx, { name: e.target.value })}
                  placeholder="Titre *"
                  className="w-48 shrink-0 text-xs"
                />
                <div className="flex min-w-[200px] flex-1 items-center gap-1">
                  <Input
                    value={doc.url}
                    onChange={(e) => patch(setExternals, idx, { url: e.target.value })}
                    placeholder="URL du lien"
                    className="flex-1 text-xs"
                  />
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-white/50 hover:text-white">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {langSelect(doc.language, (v) => patch(setExternals, idx, { language: v }))}
                <select
                  value={doc.description}
                  onChange={(e) => patch(setExternals, idx, { description: e.target.value })}
                  className="h-9 w-32 shrink-0 rounded-md border border-white/15 bg-background px-2 text-sm"
                  title="Titre section"
                >
                  {SECTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2 text-destructive hover:text-destructive" onClick={() => setExternals((p) => p.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </SortableRow>
            ))}
          </SortableContext>
        </DndContext>
        {externals.length === 0 && <p className="text-xs text-white/50">Aucun lien externe ajouté.</p>}

        {externals.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/70">
            <p className="mb-1 font-semibold text-white/90">Titre affiché sur la fiche : « {derivedExternalTitle} »</p>
            <p>
              Le titre de la carte « Liens externes » sur votre fiche est <strong>dynamique</strong> : il est déduit
              de la rubrique du <strong>premier lien de la liste</strong> (l'ordre est celui défini ici par
              glisser-déposer). Correspondances :
            </p>
            <ul className="mt-1 space-y-0.5 pl-4">
              <li>• Presse ou Media → « Ils parlent de nous »</li>
              <li>• Partenaires → « Ils nous font confiance »</li>
              <li>• Récompenses → « Nous sommes reconnus par : »</li>
              <li>• Certifications → « Nous sommes certifiés par : »</li>
              <li>• En savoir plus → « En savoir plus »</li>
            </ul>
            <p className="mt-1">
              Le titre est traduit automatiquement en EN et AR selon la langue du visiteur. Pour changer ce message,
              placez en première position le lien portant la rubrique souhaitée.
            </p>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Enregistrer les liens
        </Button>
      </div>
    </div>
  );
};

export default AffiliateExternalDocsEditor;
