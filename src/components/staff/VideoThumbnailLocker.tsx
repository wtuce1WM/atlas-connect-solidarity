import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Upload, Lock, Unlock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type VideoSource = "business_documents" | "generic_videos";

interface VideoRow {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  thumbnail_locked: boolean;
  source: VideoSource;
  business_name?: string;
}

const VideoThumbnailLocker = () => {
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<VideoRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const search = async () => {
    const id = searchId.trim();
    if (!id) return;
    setLoading(true);
    setVideo(null);

    // Try business_documents first
    const { data: bd } = await supabase
      .from("business_documents")
      .select("id, url, name, thumbnail_url, thumbnail_locked, business_id")
      .eq("id", id)
      .maybeSingle();

    if (bd) {
      let bizName = "";
      if ((bd as any).business_id) {
        const { data: b } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", (bd as any).business_id)
          .maybeSingle();
        bizName = b?.name || "";
      }
      setVideo({
        id: bd.id,
        url: bd.url,
        name: bd.name,
        thumbnail_url: bd.thumbnail_url,
        thumbnail_locked: (bd as any).thumbnail_locked ?? false,
        source: "business_documents",
        business_name: bizName,
      });
      setLoading(false);
      return;
    }

    // Fallback: generic_videos
    const { data: gv } = await (supabase as any)
      .from("generic_videos")
      .select("id, url, name, thumbnail_url, thumbnail_locked")
      .eq("id", id)
      .maybeSingle();

    if (gv) {
      setVideo({
        id: gv.id,
        url: gv.url,
        name: gv.name,
        thumbnail_url: gv.thumbnail_url,
        thumbnail_locked: gv.thumbnail_locked ?? false,
        source: "generic_videos",
        business_name: "— Vidéo générique —",
      });
    } else {
      toast.error("Aucune vidéo trouvée avec cet ID");
    }
    setLoading(false);
  };

  const handleUpload = async (file: File) => {
    if (!video) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `thumbs/manual-${video.source}-${video.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("business-images")
        .upload(path, file, { cacheControl: "31536000", upsert: true, contentType: file.type || "image/jpeg" });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("business-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: updErr } = await (supabase as any)
        .from(video.source)
        .update({ thumbnail_url: publicUrl, thumbnail_locked: true })
        .eq("id", video.id);
      if (updErr) throw updErr;

      setVideo({ ...video, thumbnail_url: publicUrl, thumbnail_locked: true });
      toast.success("Vignette affectée et verrouillée");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const toggleLock = async () => {
    if (!video) return;
    const newLocked = !video.thumbnail_locked;
    const { error } = await (supabase as any)
      .from(video.source)
      .update({ thumbnail_locked: newLocked })
      .eq("id", video.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setVideo({ ...video, thumbnail_locked: newLocked });
    toast.success(newLocked ? "Vignette verrouillée" : "Verrou retiré");
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Vidéo ID — Vignette personnalisée</h3>
        <p className="text-xs text-muted-foreground">
          Recherche une vidéo par son UUID, affecte une vignette de ton choix.
          Une vignette verrouillée 🔒 n'est jamais écrasée par le batch ni par les autres interfaces.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Coller l'UUID de la vidéo…"
            className="pl-7 font-mono text-xs"
          />
        </div>
        <Button onClick={search} disabled={loading || !searchId.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
        </Button>
      </div>

      {video && (
        <Card className="p-4 space-y-4">
          <div className="space-y-1 text-xs">
            <div><span className="text-muted-foreground">ID :</span> <span className="font-mono">{video.id}</span></div>
            <div><span className="text-muted-foreground">Source :</span> {video.source}</div>
            <div><span className="text-muted-foreground">Établissement :</span> {video.business_name || "—"}</div>
            <div><span className="text-muted-foreground">Nom :</span> {video.name || "—"}</div>
            <div className="break-all"><span className="text-muted-foreground">URL :</span> {video.url}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Vignette actuelle</Label>
              <div className="mt-1 aspect-video bg-muted rounded overflow-hidden flex items-center justify-center">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Aucune vignette
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Affecter une vignette</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Choisir une image
              </Button>
              <p className="text-[10px] text-muted-foreground">
                L'upload verrouille automatiquement la vignette.
              </p>

              <Button
                variant={video.thumbnail_locked ? "default" : "outline"}
                size="sm"
                onClick={toggleLock}
                className="w-full"
              >
                {video.thumbnail_locked ? (
                  <><Lock className="h-3.5 w-3.5 mr-2" /> Verrouillée — cliquer pour déverrouiller</>
                ) : (
                  <><Unlock className="h-3.5 w-3.5 mr-2" /> Non verrouillée — cliquer pour verrouiller</>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default VideoThumbnailLocker;
