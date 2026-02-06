import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, Image as ImageIcon, GripVertical } from "lucide-react";
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

interface SortableImageProps {
  url: string;
  index: number;
  onRemove: (index: number) => void;
}

const SortableImage = ({ url, index, onRemove }: SortableImageProps) => {
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
        isDragging && "opacity-50 z-50"
      )}
    >
      <img
        src={url}
        alt={`Image ${index + 1}`}
        className="w-full h-full object-cover"
      />
      
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
    </div>
  );
};

const ImageUploader = ({ 
  images, 
  onChange, 
  maxImages = 10, 
  businessId 
}: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

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

  const handleRemoveImage = useCallback(async (indexToRemove: number) => {
    const imageUrl = images[indexToRemove];
    
    try {
      const urlParts = imageUrl.split("/business-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("business-images").remove([filePath]);
      }
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }

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
