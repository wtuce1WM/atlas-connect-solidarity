import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface VideoUploaderProps {
  videoUrl: string;
  onChange: (url: string) => void;
  businessId?: string;
  maxSizeMB?: number;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isStorageUrl = (url: string) =>
  url.includes("supabase.co/storage/v1/object/public/business-videos");

const VideoUploader = ({
  videoUrl,
  onChange,
  businessId,
  maxSizeMB = 100,
}: VideoUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [manualUrl, setManualUrl] = useState("");
  const { toast } = useToast();

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];

      if (!file.type.startsWith("video/")) {
        toast({
          variant: "destructive",
          title: "Type de fichier invalide",
          description: "Seuls les fichiers vidéo sont acceptés (MP4, WebM, MOV).",
        });
        return;
      }

      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        toast({
          variant: "destructive",
          title: "Fichier trop volumineux",
          description: `La vidéo dépasse la limite de ${maxSizeMB}MB (${formatFileSize(file.size)}).`,
        });
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
        const fileName = `${businessId || "new"}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `businesses/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("business-videos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from("business-videos")
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          onChange(urlData.publicUrl);
          toast({
            title: "Succès",
            description: `Vidéo uploadée (${formatFileSize(file.size)}).`,
          });
        }
      } catch (error: any) {
        console.error("Video upload error:", error);
        toast({
          variant: "destructive",
          title: "Erreur d'upload",
          description: error.message || "Une erreur est survenue lors de l'upload.",
        });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [businessId, maxSizeMB, onChange, toast]
  );

  const handleRemove = useCallback(async () => {
    // If it's a storage URL, delete from storage
    if (videoUrl && isStorageUrl(videoUrl)) {
      try {
        const url = new URL(videoUrl);
        const parts = url.pathname.split("/business-videos/");
        if (parts[1]) {
          await supabase.storage.from("business-videos").remove([parts[1]]);
        }
      } catch (e) {
        console.warn("Could not delete video from storage:", e);
      }
    }
    onChange("");
  }, [videoUrl, onChange]);

  const handleManualUrlSubmit = () => {
    if (manualUrl.trim()) {
      onChange(manualUrl.trim());
      setManualUrl("");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-3">
      {/* Current video preview */}
      {videoUrl && (
        <div className="space-y-2">
          <div className="relative aspect-video w-full max-w-2xl rounded-lg overflow-hidden border bg-black">
            {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
              <iframe
                src={`https://www.youtube.com/embed/${
                  videoUrl.includes("youtu.be")
                    ? videoUrl.split("youtu.be/")[1]?.split("?")[0]
                    : videoUrl.split("v=")[1]?.split("&")[0]
                }`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : videoUrl.includes("vimeo.com") ? (
              <iframe
                src={`https://player.vimeo.com/video/${videoUrl.split("vimeo.com/")[1]?.split("?")[0]}`}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                playsInline
              />
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-80 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* URL info */}
          <p className="text-xs text-muted-foreground truncate max-w-2xl" title={videoUrl}>
            {isStorageUrl(videoUrl) ? "📦 Stockée en interne" : "🌐 URL externe"} — {videoUrl}
          </p>
        </div>
      )}

      {/* Upload zone */}
      {!videoUrl && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-primary/50",
              uploading && "pointer-events-none opacity-50"
            )}
          >
            <input
              type="file"
              id="video-upload"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="video-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Upload en cours…</p>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Uploadez une vidéo</p>
                      <p className="text-xs text-muted-foreground">
                        MP4, WebM ou MOV • Max {maxSizeMB}MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* OR manual URL */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>ou collez une URL</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... ou lien direct"
              className="flex-1 text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleManualUrlSubmit())}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!manualUrl.trim()}
              onClick={handleManualUrlSubmit}
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoUploader;
