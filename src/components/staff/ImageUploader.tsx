import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  businessId?: string;
}

const ImageUploader = ({ 
  images, 
  onChange, 
  maxImages = 10, 
  businessId 
}: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

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
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast({
            variant: "destructive",
            title: "Type de fichier invalide",
            description: `${file.name} n'est pas une image valide.`,
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "Fichier trop volumineux",
            description: `${file.name} dépasse la limite de 5MB.`,
          });
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${businessId || "new"}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `businesses/${fileName}`;

        // Upload to Supabase Storage
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

        // Get public URL
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
    
    // Extract file path from URL to delete from storage
    try {
      const urlParts = imageUrl.split("/business-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("business-images").remove([filePath]);
      }
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }

    // Update state regardless of storage deletion success
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
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
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
