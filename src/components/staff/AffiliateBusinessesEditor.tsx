import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
  Trash2,
  Percent,
  BadgeDollarSign,
  Plus,
  GripVertical,
  ImagePlus,
  X,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const BUCKET = "affiliate-promotion-images";
const MAX_IMAGES = 10;

interface Affiliate {
  id: string;
  name: string;
}

interface Promotion {
  id: string | null; // null = not yet saved
  _uid: string; // local stable id for keys / dnd
  business_id: string;
  title: string;
  promotion_type: string;
  promotion_value: number;
  promotion_currency: string;
  promotion_message: string;
  savings_amount: number | null;
  images: string[];
  sort_order: number;
  has_changes: boolean;
}

interface BusinessGroup {
  business_id: string;
  business_name: string;
  business_city: string | null;
  promotions: Promotion[];
}

interface Props {
  affiliate: Affiliate;
  onBack: () => void;
}

const uid = () => Math.random().toString(36).slice(2);

const AffiliateBusinessesEditor = ({ affiliate, onBack }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [groups, setGroups] = useState<BusinessGroup[]>([]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliate.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: bizData, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, city")
      .eq("affiliate_id", affiliate.id)
      .order("name");

    if (bizError || !bizData) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les entreprises." });
      setLoading(false);
      return;
    }

    const { data: promoData } = await supabase
      .from("affiliate_business_promotions")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const byBiz = new Map<string, Promotion[]>();
    (promoData || []).forEach((p: any) => {
      const list = byBiz.get(p.business_id) || [];
      list.push({
        id: p.id,
        _uid: p.id,
        business_id: p.business_id,
        title: p.title || "",
        promotion_type: p.promotion_type || "",
        promotion_value: Number(p.promotion_value) || 0,
        promotion_currency: p.promotion_currency || "MAD",
        promotion_message: p.promotion_message || "",
        savings_amount: p.savings_amount != null ? Number(p.savings_amount) : null,
        images: Array.isArray(p.images) ? p.images : [],
        sort_order: p.sort_order ?? 0,
        has_changes: false,
      });
      byBiz.set(p.business_id, list);
    });

    setGroups(
      bizData.map((b) => ({
        business_id: b.id,
        business_name: b.name,
        business_city: b.city,
        promotions: byBiz.get(b.id) || [],
      }))
    );
    setLoading(false);
  };

  const updatePromo = (businessId: string, _uid: string, patch: Partial<Promotion>) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.business_id !== businessId
          ? g
          : {
              ...g,
              promotions: g.promotions.map((p) =>
                p._uid === _uid ? { ...p, ...patch, has_changes: true } : p
              ),
            }
      )
    );
  };

  const addOffer = (businessId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.business_id !== businessId) return g;
        const nextOrder = (g.promotions[g.promotions.length - 1]?.sort_order ?? -1) + 1;
        const fresh: Promotion = {
          id: null,
          _uid: uid(),
          business_id: businessId,
          title: "",
          promotion_type: "",
          promotion_value: 0,
          promotion_currency: "MAD",
          promotion_message: "",
          savings_amount: null,
          images: [],
          sort_order: nextOrder,
          has_changes: true,
        };
        return { ...g, promotions: [...g.promotions, fresh] };
      })
    );
  };

  const handleSave = async (businessId: string, promo: Promotion) => {
    const plainText = promo.promotion_message.replace(/<[^>]*>/g, "");
    if (plainText.length > 500) {
      toast({ variant: "destructive", title: "Erreur", description: "Le message ne doit pas dépasser 500 caractères." });
      return;
    }
    if (promo.images.length > MAX_IMAGES) {
      toast({ variant: "destructive", title: "Erreur", description: `Maximum ${MAX_IMAGES} images.` });
      return;
    }

    setSaving(promo._uid);
    const hasType = !!promo.promotion_type;
    const payload = {
      affiliate_id: affiliate.id,
      business_id: businessId,
      title: promo.title || null,
      promotion_type: hasType ? promo.promotion_type : null,
      promotion_value: hasType ? promo.promotion_value : null,
      promotion_currency: promo.promotion_currency || "MAD",
      promotion_message: promo.promotion_message || null,
      savings_amount: promo.savings_amount,
      images: promo.images,
      sort_order: promo.sort_order,
    };

    let error;
    let newId: string | null = promo.id;
    if (promo.id) {
      const { error: e } = await supabase
        .from("affiliate_business_promotions")
        .update(payload)
        .eq("id", promo.id);
      error = e;
    } else {
      const { data, error: e } = await supabase
        .from("affiliate_business_promotions")
        .insert(payload)
        .select()
        .single();
      error = e;
      if (!error && data) newId = data.id;
    }

    setSaving(null);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Sauvegarde impossible." });
      return;
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.business_id !== businessId
          ? g
          : {
              ...g,
              promotions: g.promotions.map((p) =>
                p._uid === promo._uid ? { ...p, id: newId, _uid: newId || p._uid, has_changes: false } : p
              ),
            }
      )
    );
    toast({ title: "Succès", description: "Offre sauvegardée." });
  };

  const handleDelete = async (businessId: string, promo: Promotion) => {
    if (!confirm("Supprimer cette offre ?")) return;
    if (promo.id) {
      const { error } = await supabase
        .from("affiliate_business_promotions")
        .delete()
        .eq("id", promo.id);
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Suppression impossible." });
        return;
      }
      // Best-effort cleanup of storage objects
      const paths = promo.images
        .map((u) => {
          const i = u.indexOf(`/${BUCKET}/`);
          return i >= 0 ? u.slice(i + BUCKET.length + 2) : null;
        })
        .filter((p): p is string => !!p);
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.business_id !== businessId
          ? g
          : { ...g, promotions: g.promotions.filter((p) => p._uid !== promo._uid) }
      )
    );
    toast({ title: "Succès", description: "Offre supprimée." });
  };

  const handleReorderOffers = async (businessId: string, oldIndex: number, newIndex: number) => {
    let updated: Promotion[] = [];
    setGroups((prev) =>
      prev.map((g) => {
        if (g.business_id !== businessId) return g;
        const reordered = arrayMove(g.promotions, oldIndex, newIndex).map((p, i) => ({
          ...p,
          sort_order: i,
        }));
        updated = reordered;
        return { ...g, promotions: reordered };
      })
    );
    // Persist sort_order for saved offers
    await Promise.all(
      updated
        .filter((p) => p.id)
        .map((p) =>
          supabase
            .from("affiliate_business_promotions")
            .update({ sort_order: p.sort_order })
            .eq("id", p.id!)
        )
    );
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-muted py-4 -mx-4 px-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux affiliés
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Entreprises de {affiliate.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Gérez plusieurs offres par entreprise affiliée ({groups.length})
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune entreprise n'est rattachée à cet affilié.
          </CardContent>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.business_id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div>
                  <span className="font-semibold">{g.business_name}</span>
                  {g.business_city && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      — {g.business_city}
                    </span>
                  )}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({g.promotions.length} offre{g.promotions.length > 1 ? "s" : ""})
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => addOffer(g.business_id)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter une offre
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {g.promotions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune offre pour le moment.</p>
              ) : (
                <SortableOffers
                  group={g}
                  saving={saving}
                  onReorder={(o, n) => handleReorderOffers(g.business_id, o, n)}
                  onUpdate={(uidVal, patch) => updatePromo(g.business_id, uidVal, patch)}
                  onSave={(p) => handleSave(g.business_id, p)}
                  onDelete={(p) => handleDelete(g.business_id, p)}
                  affiliateId={affiliate.id}
                />
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

/* ---------------- Sortable offers list ---------------- */

interface SortableOffersProps {
  group: BusinessGroup;
  saving: string | null;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onUpdate: (uid: string, patch: Partial<Promotion>) => void;
  onSave: (p: Promotion) => void;
  onDelete: (p: Promotion) => void;
  affiliateId: string;
}

const SortableOffers = ({ group, saving, onReorder, onUpdate, onSave, onDelete, affiliateId }: SortableOffersProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const ids = group.promotions.map((p) => p._uid);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldI = ids.indexOf(String(active.id));
        const newI = ids.indexOf(String(over.id));
        if (oldI >= 0 && newI >= 0) onReorder(oldI, newI);
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="space-y-4">
          {group.promotions.map((p) => (
            <OfferRow
              key={p._uid}
              promo={p}
              saving={saving === p._uid}
              onUpdate={(patch) => onUpdate(p._uid, patch)}
              onSave={() => onSave(p)}
              onDelete={() => onDelete(p)}
              affiliateId={affiliateId}
              businessId={group.business_id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

/* ---------------- Single offer row ---------------- */

interface OfferRowProps {
  promo: Promotion;
  saving: boolean;
  onUpdate: (patch: Partial<Promotion>) => void;
  onSave: () => void;
  onDelete: () => void;
  affiliateId: string;
  businessId: string;
}

const OfferRow = ({ promo, saving, onUpdate, onSave, onDelete, affiliateId, businessId }: OfferRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: promo._uid });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const plainTextLength = promo.promotion_message.replace(/<[^>]*>/g, "").length;

  return (
    <div ref={setNodeRef} style={style} className={`rounded-lg border bg-card p-4 ${promo.has_changes ? "border-primary/50" : ""}`}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
          title="Déplacer"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 space-y-4">
          {/* Title + actions */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Titre de l'offre</Label>
              <Input
                value={promo.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Ex: Pack week-end, Happy Hour, Soin signature…"
              />
            </div>
            <Button
              size="sm"
              onClick={onSave}
              disabled={saving || !promo.has_changes}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Sauvegarder
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} title="Supprimer l'offre" className="h-9 w-9">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          {/* Type / value / currency */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {promo.promotion_type === "percentage" ? (
                  <Percent className="h-3.5 w-3.5" />
                ) : promo.promotion_type === "fixed" ? (
                  <BadgeDollarSign className="h-3.5 w-3.5" />
                ) : null}
                Type
              </Label>
              <Select
                value={promo.promotion_type || "none"}
                onValueChange={(v) => onUpdate({ promotion_type: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {promo.promotion_type && (
              <div className="space-y-2">
                <Label>{promo.promotion_type === "percentage" ? "Réduction (%)" : "Montant"}</Label>
                <Input
                  type="number"
                  min={0}
                  max={promo.promotion_type === "percentage" ? 100 : undefined}
                  value={promo.promotion_value}
                  onChange={(e) => onUpdate({ promotion_value: parseFloat(e.target.value) || 0 })}
                  placeholder={promo.promotion_type === "percentage" ? "Ex: 15" : "Ex: 200"}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Économies</Label>
              <Input
                type="number"
                min={0}
                value={promo.savings_amount ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onUpdate({ savings_amount: v === "" ? null : parseFloat(v) });
                }}
                placeholder="Ex: 150"
              />
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select
                value={promo.promotion_currency || "MAD"}
                onValueChange={(v) => onUpdate({ promotion_currency: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAD">MAD (Dirham)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          {/* Message */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Message promotionnel</span>
              <span className={`text-xs ${plainTextLength > 500 ? "text-destructive" : "text-muted-foreground"}`}>
                {plainTextLength}/500 caractères
              </span>
            </Label>
            <RichTextEditor
              content={promo.promotion_message}
              onChange={(html) => onUpdate({ promotion_message: html })}
              placeholder="Décrivez l'offre…"
              maxHeight="200px"
            />
          </div>

          {/* Images */}
          <OfferImages
            affiliateId={affiliateId}
            businessId={businessId}
            images={promo.images}
            onChange={(images) => onUpdate({ images })}
          />
        </div>
      </div>
    </div>
  );
};

/* ---------------- Image gallery ---------------- */

interface OfferImagesProps {
  affiliateId: string;
  businessId: string;
  images: string[];
  onChange: (next: string[]) => void;
}

const OfferImages = ({ affiliateId, businessId, images, onChange }: OfferImagesProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast({ variant: "destructive", title: "Limite atteinte", description: `Maximum ${MAX_IMAGES} images par offre.` });
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of list) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${affiliateId}/${businessId}/${uid()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) {
        toast({ variant: "destructive", title: "Erreur upload", description: error.message });
        continue;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setUploading(false);
    if (uploaded.length) onChange([...images, ...uploaded]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = async (url: string) => {
    const i = url.indexOf(`/${BUCKET}/`);
    if (i >= 0) {
      const path = url.slice(i + BUCKET.length + 2);
      await supabase.storage.from(BUCKET).remove([path]);
    }
    onChange(images.filter((u) => u !== url));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = images.indexOf(String(active.id));
    const newI = images.indexOf(String(over.id));
    if (oldI >= 0 && newI >= 0) onChange(arrayMove(images, oldI, newI));
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between">
        <span>Images ({images.length}/{MAX_IMAGES})</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}
          Ajouter
        </Button>
      </Label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {images.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Aucune image. Glissez-déposez après ajout pour réordonner.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {images.map((url, idx) => (
                <SortableThumb key={url} url={url} index={idx} onRemove={() => removeImage(url)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

const SortableThumb = ({ url, index, onRemove }: { url: string; index: number; onRemove: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
      <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab"
        title="Glisser pour réordonner"
      />
      <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 hover:bg-destructive text-white rounded-full p-1"
        title="Supprimer"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

export default AffiliateBusinessesEditor;
