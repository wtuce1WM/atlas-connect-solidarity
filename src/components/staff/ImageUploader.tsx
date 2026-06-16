import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, Image as ImageIcon, GripVertical, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, Tag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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

interface BadgeOption {
  id: string;
  name_fr: string;
}

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  businessId?: string;
  popupImageUrl?: string | null;
  onPopupChange?: (url: string | null) => void;
  badges?: BadgeOption[];
  imageBadges?: Record<string, string[]>;
  onImageBadgesChange?: (next: Record<string, string[]>) => void;
  imageTitles?: Record<string, string>;
  onImageTitlesChange?: (next: Record<string, string>) => void;
  imageDescriptions?: Record<string, string>;
  onImageDescriptionsChange?: (next: Record<string, string>) => void;
}

interface ImageMeta {
  size?: number | null;
  sizeChecked?: boolean;
  path?: string;
  extension?: string;
  width?: number | null;
  height?: number | null;
}

interface SortableImageProps {
  url: string;
  index: number;
  onRemove: (index: number) => void;
  onPreview: (url: string) => void;
  isBroken?: boolean;
  meta?: ImageMeta;
  isPopup?: boolean;
  onPopupToggle?: (url: string) => void;
  badges?: BadgeOption[];
  selectedBadgeIds?: string[];
  onToggleBadge?: (url: string, badgeId: string) => void;
  title?: string;
  onTitleChange?: (url: string, title: string) => void;
  description?: string;
  onDescriptionChange?: (url: string, description: string) => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extractPathInfo = (url: string): { path: string; extension: string } => {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    const parts = pathname.split("/");
    const filename = parts[parts.length - 1] || "";
    const ext = filename.includes(".") ? filename.split(".").pop()?.toUpperCase() || "" : "";
    // Show bucket-relative path
    const bucketIdx = parts.indexOf("business-images");
    const relativePath = bucketIdx >= 0 ? parts.slice(bucketIdx + 1).join("/") : filename;
    return { path: relativePath, extension: ext };
  } catch {
    return { path: url.slice(-30), extension: "" };
  }
};

const SortableImage = ({ url, index, onRemove, onPreview, isBroken = false, meta, isPopup, onPopupToggle, badges, selectedBadgeIds, onToggleBadge, title, onTitleChange, description, onDescriptionChange }: SortableImageProps) => {
  const [badgesOpen, setBadgesOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex flex-col gap-1", isDragging && "z-50")}>
    <div
      className={cn(
        "relative group aspect-square rounded-lg overflow-hidden border bg-muted transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
        isBroken && "ring-2 ring-amber-500"
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
      
      {/* Broken image warning */}
      {isBroken && (
        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center pointer-events-none">
          <div className="bg-amber-500 text-white p-2 rounded-full">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      )}
      
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-20 p-1.5 rounded border border-border/60 bg-background/85 text-foreground shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Popup checkbox */}
      {onPopupToggle && (
        <label
          className="absolute top-2 left-12 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-background/85 shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={!!isPopup}
            onCheckedChange={() => onPopupToggle(url)}
            className="h-3.5 w-3.5"
          />
          <span className="text-[9px] text-foreground font-medium">popup</span>
        </label>
      )}
      
      {/* Remove button */}
      <button
        type="button"
        aria-label={`Supprimer l'image ${index + 1}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        className="absolute top-2 right-2 z-20 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
      >
        <X className="h-4 w-4" />
      </button>
      
      {/* Index badge + dimensions + file size */}
      <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
        <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded">
          {index + 1}
        </span>
        <div className="flex gap-1">
          {meta?.width && meta?.height && (
            <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded">
              {meta.width}×{meta.height}
            </span>
          )}
          <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded">
            {typeof meta?.size === 'number' ? formatFileSize(meta.size) : meta?.sizeChecked ? "ext." : "…"}
          </span>
        </div>
      </div>

      {/* Metadata overlay */}
      {(() => {
        const info = extractPathInfo(url);
        return (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 text-white text-xs leading-relaxed p-2 opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden space-y-0.5 pointer-events-none">
            <p className="truncate font-medium" title={info.path}>📁 {info.path}</p>
            <div className="flex gap-3 flex-wrap">
              {info.extension && <span>📄 {info.extension}</span>}
              {meta?.width && meta?.height && <span>📐 {meta.width}×{meta.height}</span>}
              <span>⚖️ {typeof meta?.size === 'number' ? formatFileSize(meta.size) : meta?.sizeChecked ? "ext." : "…"}</span>
            </div>
          </div>
        );
      })()}
    </div>

    {/* Title input */}
    {onTitleChange && (
      <Input
        value={title || ""}
        onChange={(e) => onTitleChange(url, e.target.value)}
        placeholder="Titre"
        className="h-6 text-[10px]"
      />
    )}

    {/* Description textarea (max 500) */}
    {onDescriptionChange && (
      <div className="space-y-0.5">
        <Textarea
          value={description || ""}
          onChange={(e) => onDescriptionChange(url, e.target.value.slice(0, 500))}
          placeholder="Description (max 500)"
          maxLength={500}
          rows={2}
          className="text-[10px] min-h-[40px] resize-y"
        />
        <p className="text-[9px] text-muted-foreground text-right">{(description || "").length}/500</p>
      </div>
    )}

    {/* Collapsible badges drawer */}
    {badges && badges.length > 0 && onToggleBadge && (
      <div className="rounded-md border border-border bg-card">
        <button
          type="button"
          onClick={() => setBadgesOpen((v) => !v)}
          className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted/50 rounded-md"
        >
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            Badges ({selectedBadgeIds?.length || 0})
          </span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", badgesOpen && "rotate-180")} />
        </button>
        {badgesOpen && (
          <div className="flex flex-wrap gap-1 px-2 pb-2 pt-0.5">
            {badges.map((badge) => {
              const isSelected = selectedBadgeIds?.includes(badge.id) || false;
              return (
                <button
                  key={badge.id}
                  type="button"
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full border transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  )}
                  onClick={() => onToggleBadge(url, badge.id)}
                >
                  {badge.name_fr}
                </button>
              );
            })}
          </div>
        )}
      </div>
    )}
    </div>
  );
};

const ImageUploader = ({ 
  images, 
  onChange, 
  maxImages = 12, 
  businessId,
  popupImageUrl,
  onPopupChange,
  badges,
  imageBadges,
  onImageBadgesChange,
  imageTitles,
  onImageTitlesChange,
  imageDescriptions,
  onImageDescriptionsChange,
}: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const [imageSizes, setImageSizes] = useState<Record<string, number | null>>({});
  const [imageDims, setImageDims] = useState<Record<string, { w: number; h: number } | null>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch file sizes and check broken URLs in one pass
  useEffect(() => {
    if (!images || images.length === 0) {
      setImageSizes({});
      setImageDims({});
      setBrokenUrls(new Set());
      return;
    }

    let mounted = true;

    const checkAll = async () => {
      const sizes: Record<string, number | null> = {};
      const dims: Record<string, { w: number; h: number } | null> = {};
      const broken = new Set<string>();

      await Promise.all(
        images.map(async (url) => {
          // Load dimensions via <img>
          const dimPromise = new Promise<{ w: number; h: number } | null>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve(null);
            img.src = url;
          });

          try {
            const res = await fetch(url);
            if (!res.ok) {
              broken.add(url);
              sizes[url] = null;
              dims[url] = await dimPromise;
              return;
            }
            const blob = await res.blob();
            sizes[url] = blob.size;
          } catch {
            const imgResult = await dimPromise;
            if (!imgResult) broken.add(url);
            sizes[url] = null;
          }
          dims[url] = await dimPromise;
        })
      );

      if (mounted) {
        setImageSizes(sizes);
        setImageDims(dims);
        setBrokenUrls(broken);
      }
    };

    checkAll();

    return () => { mounted = false; };
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      const newImages = arrayMove(images, oldIndex, newIndex);
      onChange(newImages);
    }
  }, [images, onChange]);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast({
        variant: "destructive",
        title: "Limite atteinte",
        description: `Maximum ${maxImages} images autorisées.`,
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          toast({
            variant: "destructive",
            title: "Type de fichier invalide",
            description: `${file.name} n'est pas une image valide.`,
          });
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "Fichier trop volumineux",
            description: `${file.name} dépasse la limite de 5MB.`,
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${businessId || "new"}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `businesses/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("business-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            variant: "destructive",
            title: "Erreur d'upload",
            description: `Erreur lors de l'upload de ${file.name}.`,
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("business-images")
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
        toast({
          title: "Succès",
          description: `${uploadedUrls.length} image(s) uploadée(s) avec succès.`,
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
  }, [images, maxImages, businessId, onChange, toast]);

  const handleRemoveImage = useCallback((indexToRemove: number) => {
    // Only remove from the list — do NOT delete from storage here.
    // Physical deletion will happen on form save by comparing before/after.
    const removedUrl = images[indexToRemove];
    const newImages = images.filter((_, index) => index !== indexToRemove);
    onChange(newImages);
    // If the removed image was the welcome-popup image, clear the reference too
    // (otherwise a stale popup_image_url triggers a broken popup on the front).
    if (removedUrl && popupImageUrl === removedUrl) {
      onPopupChange?.(null);
    }
  }, [images, onChange, popupImageUrl, onPopupChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-4">
      {/* Broken images warning */}
      {brokenUrls.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{brokenUrls.size} fichier(s) introuvable(s)</p>
            <p className="text-sm opacity-80">Ces images ont été supprimées du stockage. Veuillez les supprimer et en uploader de nouvelles.</p>
          </div>
        </div>
      )}

      {/* Image Grid with DnD */}
      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {images.map((url, index) => (
                <SortableImage
                  key={url}
                  url={url}
                  index={index}
                  onRemove={handleRemoveImage}
                  onPreview={setLightboxUrl}
                  isBroken={brokenUrls.has(url)}
                  meta={{ size: imageSizes[url], sizeChecked: url in imageSizes, width: imageDims[url]?.w, height: imageDims[url]?.h }}
                  isPopup={popupImageUrl === url}
                  onPopupToggle={onPopupChange ? (u) => onPopupChange(popupImageUrl === u ? null : u) : undefined}
                  badges={badges}
                  selectedBadgeIds={imageBadges?.[url] || []}
                  onToggleBadge={onImageBadgesChange ? (u, bid) => {
                    const current = imageBadges?.[u] || [];
                    const next = current.includes(bid) ? current.filter(x => x !== bid) : [...current, bid];
                    onImageBadgesChange({ ...(imageBadges || {}), [u]: next });
                  } : undefined}
                  title={imageTitles?.[url] || ""}
                  onTitleChange={onImageTitlesChange ? (u, t) => {
                    onImageTitlesChange({ ...(imageTitles || {}), [u]: t });
                  } : undefined}
                  description={imageDescriptions?.[url] || ""}
                  onDescriptionChange={onImageDescriptionsChange ? (u, d) => {
                    onImageDescriptionsChange({ ...(imageDescriptions || {}), [u]: d });
                  } : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {images.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Glissez-déposez les images pour les réorganiser
        </p>
      )}

      {/* Upload Zone */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-primary/50",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          <input
            type="file"
            id={`image-upload-${businessId || 'default'}`}
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor={`image-upload-${businessId || 'default'}`} className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              ) : (
                <div className="p-3 bg-primary/10 rounded-full">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {uploading ? "Upload en cours..." : "Cliquez ou glissez-déposez"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {images.length}/{maxImages} images • Max 5MB par image
                </p>
              </div>
            </div>
          </label>
        </div>
      )}

      {images.length >= maxImages && (
        <p className="text-sm text-muted-foreground text-center">
          Nombre maximum d'images atteint ({maxImages})
        </p>
      )}

      {/* Summary */}
      {images.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Récapitulatif images</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>📷 {images.length}/{maxImages} images</span>
            {(() => {
              const knownSizes = Object.values(imageSizes).filter((s): s is number => typeof s === 'number');
              const totalSize = knownSizes.reduce((a, b) => a + b, 0);
              const extCount = Object.values(imageSizes).filter(s => s === null).length;
              return (
                <>
                  {knownSizes.length > 0 && <span>⚖️ {formatFileSize(totalSize)} (total)</span>}
                  {extCount > 0 && <span>🌐 {extCount} externe{extCount > 1 ? 's' : ''}</span>}
                </>
              );
            })()}
            {brokenUrls.size > 0 && <span className="text-amber-600">⚠️ {brokenUrls.size} introuvable{brokenUrls.size > 1 ? 's' : ''}</span>}
            {(() => {
              const exts = new Set<string>();
              images.forEach(url => {
                const info = extractPathInfo(url);
                if (info.extension) exts.add(info.extension);
              });
              return exts.size > 0 ? <span>📄 {Array.from(exts).join(', ')}</span> : null;
            })()}
          </div>
          {images.length > 30 && (
            <p className="text-destructive font-medium">🚫 {images.length - 30} image{images.length - 30 > 1 ? 's' : ''} en trop — la sauvegarde sera bloquée tant que le nombre dépasse 30.</p>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => {
            const idx = images.indexOf(lightboxUrl);
            if (e.key === "ArrowLeft" && idx > 0) { e.stopPropagation(); setLightboxUrl(images[idx - 1]); }
            if (e.key === "ArrowRight" && idx < images.length - 1) { e.stopPropagation(); setLightboxUrl(images[idx + 1]); }
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

          {/* Previous */}
          {images.indexOf(lightboxUrl) > 0 && (
            <button
              type="button"
              className="absolute left-4 z-10 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const idx = images.indexOf(lightboxUrl);
                setLightboxUrl(images[idx - 1]);
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Next */}
          {images.indexOf(lightboxUrl) < images.length - 1 && (
            <button
              type="button"
              className="absolute right-4 z-10 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const idx = images.indexOf(lightboxUrl);
                setLightboxUrl(images[idx + 1]);
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
            {images.indexOf(lightboxUrl) + 1} / {images.length}
          </div>

          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
