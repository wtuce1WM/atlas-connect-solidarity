import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, Award, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabelUploaderProps {
  labelUrl: string;
  onChange: (url: string) => void;
  businessId?: string;
  label?: string;
  labelKey?: string;
}

const LabelUploader = ({ 
  labelUrl, 
  onChange, 
  businessId,
  label = "Label",
  labelKey = "label1"
}: LabelUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const { toast } = useToast();

  // Check if label URL is broken
  useEffect(() => {
    if (!labelUrl) {
      setIsBroken(false);
      return;
    }

    const checkUrl = async () => {
      try {
        const response = await fetch(labelUrl, { method: "HEAD" });
        setIsBroken(!response.ok);
      } catch {
        // Try loading as image
        const img = new Image();
        img.onload = () => setIsBroken(false);
        img.onerror = () => setIsBroken(true);
        img.src = labelUrl;
      }
    };

    checkUrl();
  }, [labelUrl]);

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

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "L'image ne doit pas dépasser 2MB.",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${businessId || "new"}-${labelKey}-${Date.now()}.${fileExt}`;
      const filePath = `businesses/labels/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          variant: "destructive",
          title: "Erreur d'upload",
          description: "Erreur lors de l'upload de l'image.",
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
          description: `${label} uploadé avec succès.`,
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
  }, [businessId, labelKey, label, onChange, toast]);

  const handleRemoveLabel = useCallback(async () => {
    // Extract file path from URL to delete from storage
    try {
      const urlParts = labelUrl.split("/business-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("business-images").remove([filePath]);
      }
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }

    onChange("");
  }, [labelUrl, onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const inputId = `${labelKey}-upload`;

  return (
    <div className="space-y-4">
      {/* Broken file warning */}
      {labelUrl && isBroken && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Fichier introuvable</p>
            <p className="text-sm opacity-80">Ce {label} a été supprimé du stockage. Veuillez le supprimer et en uploader un nouveau.</p>
          </div>
        </div>
      )}

      {/* Current Label Image */}
      {labelUrl && (
        <div className="relative inline-block">
          <div className={cn(
            "w-24 h-24 rounded-lg border bg-white p-2 flex items-center justify-center overflow-hidden",
            isBroken && "ring-2 ring-amber-500"
          )}>
            {isBroken ? (
              <div className="flex flex-col items-center text-amber-500">
                <AlertTriangle className="h-6 w-6" />
                <span className="text-xs mt-1">Introuvable</span>
              </div>
            ) : (
              <img
                src={labelUrl}
                alt={label}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemoveLabel}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Upload Zone */}
      {!labelUrl && (
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
            id={inputId}
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor={inputId} className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <div className="p-3 bg-primary/10 rounded-full">
                  <Award className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {uploading ? "Upload..." : `Ajouter ${label}`}
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

export default LabelUploader;
