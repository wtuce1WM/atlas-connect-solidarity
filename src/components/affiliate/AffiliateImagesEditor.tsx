import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, GripVertical, Image as ImageIcon, Save } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  businessId: string;
}

export interface AffiliateImagesEditorHandle {
  save: () => Promise<void>;
}

const MAX_DESC = 500;

interface SortableRowProps {
  url: string;
  index: number;
  title: string;
  description: string;
  isPopup: boolean;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onPopupToggle: () => void;
}

const SortableRow = ({
  url,
  index,
  title,
  description,
  isPopup,
  onTitleChange,
  onDescriptionChange,
  onPopupToggle,
}: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-3 p-3 border border-border rounded-lg bg-card"
    >
      <div className="flex flex-col items-center gap-2 shrink-0">
        <button
          type="button"
          className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Réorganiser"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-[10px] font-semibold text-muted-foreground">#{index + 1}</span>
      </div>

      <div className="relative w-24 h-24 shrink-0 rounded overflow-hidden bg-muted">
        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Titre de l'image"
          className="h-8 text-sm"
        />
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value.slice(0, MAX_DESC))}
          placeholder="Description (max 500 caractères)"
          className="text-xs min-h-[60px]"
          maxLength={MAX_DESC}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={isPopup} onCheckedChange={onPopupToggle} />
            <span className={isPopup ? "font-semibold text-primary" : "text-muted-foreground"}>
              Image popup
            </span>
          </label>
          <span className="text-[10px] text-muted-foreground">
            {description.length}/{MAX_DESC}
          </span>
        </div>
      </div>
    </div>
  );
};

const AffiliateImagesEditor = forwardRef<AffiliateImagesEditorHandle, Props>(
  ({ businessId }, ref) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [popupUrl, setPopupUrl] = useState<string | null>(null);
    const [titles, setTitles] = useState<Record<string, string>>({});
    const [descriptions, setDescriptions] = useState<Record<string, string>>({});
    const [dirty, setDirty] = useState(false);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
      const load = async () => {
        setLoading(true);
        const [{ data: biz }, { data: titleRows }] = await Promise.all([
          supabase.from("businesses").select("images, popup_image_url").eq("id", businessId).maybeSingle(),
          supabase.from("business_image_titles").select("image_url, title, description").eq("business_id", businessId),
        ]);

        setImages(((biz as any)?.images as string[]) || []);
        setPopupUrl((biz as any)?.popup_image_url || null);

        const t: Record<string, string> = {};
        const d: Record<string, string> = {};
        ((titleRows as any[]) || []).forEach((r) => {
          if (r.title) t[r.image_url] = r.title;
          if (r.description) d[r.image_url] = r.description;
        });
        setTitles(t);
        setDescriptions(d);
        setDirty(false);
        setLoading(false);
      };
      load();
    }, [businessId]);

    const markDirty = () => setDirty(true);

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      if (oldIndex < 0 || newIndex < 0) return;
      setImages((prev) => arrayMove(prev, oldIndex, newIndex));
      markDirty();
    };

    const togglePopup = (url: string) => {
      setPopupUrl((prev) => (prev === url ? null : url));
      markDirty();
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        const { error: bizErr } = await supabase
          .from("businesses")
          .update({ images, popup_image_url: popupUrl })
          .eq("id", businessId);
        if (bizErr) throw bizErr;

        // Refresh titles: delete then insert non-empty rows for current images only
        const { error: delErr } = await supabase
          .from("business_image_titles")
          .delete()
          .eq("business_id", businessId);
        if (delErr) throw delErr;

        const rows = images
          .map((url) => {
            const title = (titles[url] || "").trim();
            const description = (descriptions[url] || "").trim().slice(0, MAX_DESC);
            if (!title && !description) return null;
            return {
              business_id: businessId,
              image_url: url,
              title: title || null,
              description: description || null,
            };
          })
          .filter(Boolean) as any[];

        if (rows.length > 0) {
          const { error: insErr } = await supabase.from("business_image_titles").insert(rows);
          if (insErr) throw insErr;
        }

        setDirty(false);
        toast({ title: "Images enregistrées ✓" });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erreur", description: e.message });
      } finally {
        setSaving(false);
      }
    };

    useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mb-2" />
          <p className="text-sm">Aucune image pour cet établissement.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {images.length} image{images.length > 1 ? "s" : ""} · Glissez pour réordonner. L'image cochée « Popup » s'affiche en avant sur la fiche.
          </p>
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Enregistrer les images
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {images.map((url, i) => (
                <SortableRow
                  key={url}
                  url={url}
                  index={i}
                  title={titles[url] || ""}
                  description={descriptions[url] || ""}
                  isPopup={popupUrl === url}
                  onTitleChange={(v) => {
                    setTitles((prev) => ({ ...prev, [url]: v }));
                    markDirty();
                  }}
                  onDescriptionChange={(v) => {
                    setDescriptions((prev) => ({ ...prev, [url]: v }));
                    markDirty();
                  }}
                  onPopupToggle={() => togglePopup(url)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  }
);

AffiliateImagesEditor.displayName = "AffiliateImagesEditor";

export default AffiliateImagesEditor;
