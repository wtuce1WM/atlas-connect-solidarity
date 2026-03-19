import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X, Image as ImageIcon, Video, Upload, Plus, Globe } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

interface WebOnlyEditorProps {
  businessId: string;
}

const BUCKET = "web-only-media";
const MAX_IMAGES = 5;
const MAX_VIDEOS = 5;
const MAX_DESC_LENGTH = 1000;

const getPublicUrl = (path: string) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

const WebOnlyEditor = ({ businessId }: WebOnlyEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);

  // Load existing data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("business_web_only" as any)
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      if (data) {
        setRecordId((data as any).id);
        setDescription((data as any).description || "");
        setImages((data as any).images || []);
        setVideos((data as any).videos || []);
      } else {
        setRecordId(null);
        setDescription("");
        setImages([]);
        setVideos([]);
      }
      setLoading(false);
    };
    load();
  }, [businessId]);

  // Auto-save
  const save = useCallback(async (desc: string, imgs: string[], vids: string[]) => {
    setSaving(true);
    const payload = {
      business_id: businessId,
      description: desc,
      images: imgs,
      videos: vids,
      updated_at: new Date().toISOString(),
    };

    if (recordId) {
      await supabase
        .from("business_web_only" as any)
        .update(payload as any)
        .eq("id", recordId);
    } else {
      const { data } = await supabase
        .from("business_web_only" as any)
        .insert(payload as any)
        .select("id")
        .single();
      if (data) setRecordId((data as any).id);
    }
    setSaving(false);
  }, [businessId, recordId]);

  const handleDescriptionChange = useCallback((html: string) => {
    // Strip HTML tags to count text length
    const textOnly = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
    if (textOnly.length > MAX_DESC_LENGTH) return;
    setDescription(html);
    save(html, images, videos);
  }, [images, videos, save]);

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (images.length >= MAX_IMAGES) {
      toast({ variant: "destructive", title: "Maximum atteint", description: `${MAX_IMAGES} images maximum.` });
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Type invalide", description: "Seules les images sont acceptées." });
      return;
    }

    setUploadingImage(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${businessId}/images/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);

    if (error) {
      toast({ variant: "destructive", title: "Erreur upload", description: error.message });
      setUploadingImage(false);
      return;
    }

    const url = getPublicUrl(path);
    const next = [...images, url];
    setImages(next);
    await save(description, next, videos);
    setUploadingImage(false);
  }, [businessId, images, description, videos, save, toast]);

  const removeImage = useCallback(async (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    await save(description, next, videos);
  }, [images, description, videos, save]);

  const handleVideoUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (videos.length >= MAX_VIDEOS) {
      toast({ variant: "destructive", title: "Maximum atteint", description: `${MAX_VIDEOS} vidéos maximum.` });
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("video/")) {
      toast({ variant: "destructive", title: "Type invalide", description: "Seuls les fichiers vidéo sont acceptés." });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "100 MB maximum." });
      return;
    }

    setUploadingVideo(true);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${businessId}/videos/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);

    if (error) {
      toast({ variant: "destructive", title: "Erreur upload", description: error.message });
      setUploadingVideo(false);
      return;
    }

    const url = getPublicUrl(path);
    const next = [...videos, url];
    setVideos(next);
    await save(description, next, videos);
    setUploadingVideo(false);
  }, [businessId, videos, description, save, toast]);

  const addVideoUrl = useCallback(async () => {
    const url = videoUrlInput.trim();
    if (!url) return;
    if (videos.length >= MAX_VIDEOS) {
      toast({ variant: "destructive", title: "Maximum atteint", description: `${MAX_VIDEOS} vidéos maximum.` });
      return;
    }
    const next = [...videos, url];
    setVideos(next);
    setVideoUrlInput("");
    await save(description, images, next);
  }, [videoUrlInput, videos, description, images, save, toast]);

  const removeVideo = useCallback(async (index: number) => {
    const next = videos.filter((_, i) => i !== index);
    setVideos(next);
    await save(description, images, next);
  }, [videos, description, images, save]);

  const plainTextLength = description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").length;

  if (loading) {
    return (
      <div className="p-4 border border-purple-300 bg-purple-50 rounded-lg flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement section Web Only…</span>
      </div>
    );
  }

  return (
    <div className="p-4 border-2 border-purple-400 bg-purple-50 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xl font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-purple-600" />
          Web Only
        </Label>
        {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Sauvegarde…</span>}
      </div>

      {/* Rich text description */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Description Web Only</Label>
        <RichTextEditor
          content={description}
          onChange={handleDescriptionChange}
          placeholder="Décrivez l'offre web only…"
          maxHeight="200px"
        />
        <p className={`text-xs text-right ${plainTextLength > MAX_DESC_LENGTH * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
          {plainTextLength} / {MAX_DESC_LENGTH}
        </p>
      </div>

      {/* Images (max 5) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Images ({images.length}/{MAX_IMAGES})</Label>
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border bg-background">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <label className="w-24 h-24 rounded-lg border-2 border-dashed border-purple-300 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition-colors">
              {uploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-purple-400" />
                  <span className="text-[10px] text-purple-500 mt-1">Ajouter</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
                disabled={uploadingImage}
              />
            </label>
          )}
        </div>
      </div>

      {/* Videos (max 5) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Vidéos ({videos.length}/{MAX_VIDEOS})</Label>
        <div className="space-y-2">
          {videos.map((url, i) => (
            <div key={i} className="flex items-center gap-2 bg-background rounded-lg border px-3 py-2">
              <Video className="h-4 w-4 text-purple-500 shrink-0" />
              <span className="text-xs truncate flex-1">{url.length > 60 ? url.slice(0, 60) + "…" : url}</span>
              <button
                type="button"
                onClick={() => removeVideo(i)}
                className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {videos.length < MAX_VIDEOS && (
            <div className="flex gap-2">
              <Input
                placeholder="https://youtube.com/watch?v=... ou URL vidéo"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                className="flex-1 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideoUrl(); } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addVideoUrl} disabled={!videoUrlInput.trim()}>
                <Plus className="h-4 w-4 mr-1" />URL
              </Button>
              <label>
                <Button type="button" size="sm" variant="outline" asChild className="cursor-pointer">
                  <span>
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Fichier</>}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleVideoUpload(e.target.files)}
                  disabled={uploadingVideo}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebOnlyEditor;
