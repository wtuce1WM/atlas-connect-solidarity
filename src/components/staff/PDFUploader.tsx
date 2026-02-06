import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PDFUploaderProps {
  pdfUrl: string;
  onChange: (url: string) => void;
  businessId?: string;
}

const PDFUploader = ({ 
  pdfUrl, 
  onChange, 
  businessId 
}: PDFUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];

    // Validate file type
    if (file.type !== "application/pdf") {
      toast({
        variant: "destructive",
        title: "Type de fichier invalide",
        description: "Seuls les fichiers PDF sont acceptés.",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "Le fichier PDF ne doit pas dépasser 10MB.",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileName = `${businessId || "new"}-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
      const filePath = `businesses/pdfs/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          variant: "destructive",
          title: "Erreur d'upload",
          description: "Erreur lors de l'upload du fichier PDF.",
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
          description: "PDF uploadé avec succès.",
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

  const handleRemovePDF = useCallback(async () => {
    // Extract file path from URL to delete from storage
    try {
      const urlParts = pdfUrl.split("/business-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("business-images").remove([filePath]);
      }
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }

    onChange("");
  }, [pdfUrl, onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Extract filename from URL
  const getFileName = (url: string) => {
    try {
      const parts = url.split("/");
      return parts[parts.length - 1];
    } catch {
      return "document.pdf";
    }
  };

  return (
    <div className="space-y-4">
      {/* Current PDF */}
      {pdfUrl && (
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <div className="p-2 bg-primary/10 rounded">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{getFileName(pdfUrl)}</p>
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Voir le PDF
            </a>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemovePDF}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload Zone */}
      {!pdfUrl && (
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
            id="pdf-upload"
            accept="application/pdf"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              ) : (
                <div className="p-3 bg-primary/10 rounded-full">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {uploading ? "Upload en cours..." : "Cliquez ou glissez-déposez un PDF"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Max 10MB • Format PDF uniquement
                </p>
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
