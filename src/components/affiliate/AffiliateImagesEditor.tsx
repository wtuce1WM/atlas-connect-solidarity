import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Loader2,
  GripVertical,
  Image as ImageIcon,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  businessId: string;
}

export interface AffiliateImagesEditorHandle {
  save: () => Promise<void>;
}

const MAX_DESC = 500;

interface SortableCardProps {
  url: string;
  index: number;
  title: string;
  description: string;
  isPopup: boolean;
  onPreview: (url: string) => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onPopupToggle: () => void;
}

const SortableCard = ({
  url,
  index,
  title,
  description,
  isPopup,
  onPreview,
  onTitleChange,
  onDescriptionChange,
  onPopupToggle,
}: SortableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex flex-col gap-1", isDragging && "z-50")}>
      <div
        className={cn(
          "relative group aspect-square rounded-lg overflow-hidden border bg-muted transition-shadow hover:shadow-md",
          isDragging && "opacity-50",
          isPopup && "ring-2 ring-primary"
        )}
      >
        <img
          src={url}
          alt={`Image ${index + 1}`}
          className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
          onClick={() => onPreview(url)}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-20 p-1.5 rounded border border-border/60 bg-background/85 text-foreground shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Popup checkbox */}
        <label
          className="absolute top-2 left-12 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-background/85 shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isPopup}
            onCheckedChange={onPopupToggle}
            className="h-3.5 w-3.5"
          />
          <span className="text-[9px] text-foreground font-medium">popup</span>
        </label>

        {/* Index badge */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
          <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded">
            {index + 1}
          </span>
        </div>
      </div>

      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Titre"
        className="h-6 text-[10px]"
      />

      <div className="space-y-0.5">
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value.slice(0, MAX_DESC))}
          placeholder="Description (max 500)"
          maxLength={MAX_DESC}
          rows={2}
          className="text-[10px] min-h-[40px] resize-y"
        />
        <p className="text-[9px] text-muted-foreground text-right">
          {description.length}/{MAX_DESC}
        </p>
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
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

    const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setImages((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      markDirty();
    }, []);

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

    const lightboxIndex = lightboxUrl ? images.indexOf(lightboxUrl) : -1;
    const lightboxTitle = lightboxUrl ? titles[lightboxUrl] : "";
    const lightboxDesc = lightboxUrl ? descriptions[lightboxUrl] : "";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {images.length} image{images.length > 1 ? "s" : ""} · Glissez pour réordonner, cliquez pour ouvrir en plein écran.
          </p>
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Enregistrer les images
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {images.map((url, i) => (
                <SortableCard
                  key={url}
                  url={url}
                  index={i}
                  title={titles[url] || ""}
                  description={descriptions[url] || ""}
                  isPopup={popupUrl === url}
                  onPreview={setLightboxUrl}
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

        {/* Lightbox slideshow */}
        {lightboxUrl && lightboxIndex >= 0 && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
            onClick={() => setLightboxUrl(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" && lightboxIndex > 0) {
                e.stopPropagation();
                setLightboxUrl(images[lightboxIndex - 1]);
              }
              if (e.key === "ArrowRight" && lightboxIndex < images.length - 1) {
                e.stopPropagation();
                setLightboxUrl(images[lightboxIndex + 1]);
              }
              if (e.key === "Escape") setLightboxUrl(null);
            }}
            tabIndex={0}
            ref={(el) => el?.focus()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="h-6 w-6" />
            </button>

            {lightboxIndex > 0 && (
              <button
                type="button"
                className="absolute left-4 z-10 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxUrl(images[lightboxIndex - 1]);
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}

            {lightboxIndex < images.length - 1 && (
              <button
                type="button"
                className="absolute right-4 z-10 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxUrl(images[lightboxIndex + 1]);
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}

            <div
              className="flex flex-col items-center gap-3 max-w-[92vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxUrl}
                alt={lightboxTitle || "Preview"}
                className="max-w-[92vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              {(lightboxTitle || lightboxDesc) && (
                <div className="bg-black/70 text-white rounded-lg px-4 py-2 max-w-[80vw] text-center">
                  {lightboxTitle && <p className="font-semibold text-sm">{lightboxTitle}</p>}
                  {lightboxDesc && <p className="text-xs opacity-90 mt-0.5">{lightboxDesc}</p>}
                </div>
              )}
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
              {lightboxIndex + 1} / {images.length}
            </div>
          </div>
        )}
      </div>
    );
  }
);

AffiliateImagesEditor.displayName = "AffiliateImagesEditor";

export default AffiliateImagesEditor;
