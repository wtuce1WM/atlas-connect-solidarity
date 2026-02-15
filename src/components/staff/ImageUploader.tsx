import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, Image as ImageIcon, GripVertical, AlertTriangle } from "lucide-react";
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

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  businessId?: string;
}

interface ImageMeta {
  size?: number;
  path?: string;
  extension?: string;
}

interface SortableImageProps {
  url: string;
  index: number;
  onRemove: (index: number) => void;
  isBroken?: boolean;
  meta?: ImageMeta;
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

const SortableImage = ({ url, index, onRemove, isBroken = false, meta }: SortableImageProps) => {
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group aspect-square rounded-lg overflow-hidden border bg-muted",
        isDragging && "opacity-50 z-50",
        isBroken && "ring-2 ring-amber-500"
      )}
    >
      <img
        src={url}
        alt={`Image ${index + 1}`}
        className="w-full h-full object-cover"
      />
      
      {/* Broken image warning */}
      {isBroken && (
        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
          <div className="bg-amber-500 text-white p-2 rounded-full">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      )}
      
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
      
      {/* Index badge */}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
        {index + 1}
      </div>

      {/* Metadata overlay */}
      {(() => {
        const info = extractPathInfo(url);
        return (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] leading-tight p-1.5 opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden">
            <p className="truncate" title={info.path}>📁 {info.path}</p>
            {info.extension && <span className="mr-2">📄 {info.extension}</span>}
            {meta?.size != null && <span>⚖️ {formatFileSize(meta.size)}</span>}
          </div>
        );
      })()}
    </div>
  );
};

const ImageUploader = ({ 
  images, 
  onChange, 
  maxImages = 12, 
  businessId 
}: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const [imageSizes, setImageSizes] = useState<Record<string, number>>({});
  const { toast } = useToast();

  // Fetch file sizes via HEAD requests
  useEffect(() => {
    if (!images || images.length === 0) {
      setImageSizes({});
      return;
    }
    const fetchSizes = async () => {
      const sizes: Record<string, number> = {};
      await Promise.all(
        images.map(async (url) => {
          try {
            const res = await fetch(url, { method: "HEAD" });
            const cl = res.headers.get("content-length");
            if (cl) sizes[url] = parseInt(cl, 10);
          } catch { /* ignore */ }
        })
      );
      setImageSizes(sizes);
    };
    fetchSizes();
  }, [images]);

  // Check for broken image URLs
  useEffect(() => {
    if (!images || images.length === 0) {
      setBrokenUrls(new Set());
      return;
    }

    const checkImages = async () => {
      const broken = new Set<string>();
      await Promise.all(
        images.map(async (url) => {
          try {
            const response = await fetch(url, { method: "HEAD" });
            if (!response.ok) {
              broken.add(url);
            }
          } catch {
            // Try loading as image
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => {
                broken.add(url);
                resolve();
              };
              img.src = url;
            });
          }
        })
      );
      setBrokenUrls(broken);
    };

    checkImages();
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    const newImages = images.filter((_, index) => index !== indexToRemove);
    onChange(newImages);
  }, [images, onChange]);

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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((url, index) => (
                <SortableImage
                  key={url}
                  url={url}
                  index={index}
                  onRemove={handleRemoveImage}
                  isBroken={brokenUrls.has(url)}
                  meta={{ size: imageSizes[url] }}
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
            id="image-upload"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="image-upload" className="cursor-pointer">
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
    </div>
  );
};

export default ImageUploader;
