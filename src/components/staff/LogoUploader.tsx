import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoUploaderProps {
  logoUrl: string;
  onChange: (url: string) => void;
  businessId?: string;
}

const LogoUploader = ({ 
  logoUrl, 
  onChange, 
  businessId 
}: LogoUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Type de fichier invalide",
        description: "Seules les images sont acceptées.",
      });
      return;
    }

    // Validate file size (max 2MB for logos)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "Le logo ne doit pas dépasser 2MB.",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${businessId || "new"}-logo-${Date.now()}.${fileExt}`;
      const filePath = `businesses/logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          variant: "destructive",
          title: "Erreur d'upload",
          description: "Erreur lors de l'upload du logo.",
        });
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("business-images")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        onChange(urlData.publicUrl);
        toast({
          title: "Succès",
          description: "Logo uploadé avec succès.",
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
  }, [businessId, onChange, toast]);

  const handleRemoveLogo = useCallback(async () => {
    // Extract file path from URL to delete from storage
    try {
      const urlParts = logoUrl.split("/business-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("business-images").remove([filePath]);
      }
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }

    onChange("");
  }, [logoUrl, onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-4">
      {/* Current Logo */}
      {logoUrl && (
        <div className="relative inline-block">
          <div className="w-32 h-32 rounded-lg border bg-white p-2 flex items-center justify-center overflow-hidden">
            <img
              src={logoUrl}
              alt="Logo"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemoveLogo}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Upload Zone */}
      {!logoUrl && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-primary/50 w-fit",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          <input
            type="file"
            id="logo-upload"
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="logo-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <div className="p-3 bg-primary/10 rounded-full">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {uploading ? "Upload..." : "Ajouter un logo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Max 2MB
                </p>
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
};

export default LogoUploader;
