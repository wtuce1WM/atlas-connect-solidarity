import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Upload, Lock, Unlock, AlertCircle, Camera } from "lucide-react";
import { toast } from "sonner";
import { getVideoEmbed } from "@/lib/videoEmbed";

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
  const [capturing, setCapturing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const search = async () => {
    const id = searchId.trim();
    if (!id) return;
    setLoading(true);
    setVideo(null);

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

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || "");
        resolve(res.slice(res.indexOf(",") + 1));
      };
      reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
      reader.readAsDataURL(blob);
    });

  // Upload + persistance via edge function staff (service role) : plus de dépendance au RLS storage côté client.
  const persistThumbnail = async (blob: Blob, ext: string, contentType: string) => {
    if (!video) return;
    const imageBase64 = await blobToBase64(blob);
    const { data, error } = await supabase.functions.invoke("set-video-thumbnail", {
      body: { videoId: video.id, source: video.source, imageBase64, contentType, ext },
    });
    if (error) throw new Error((data as any)?.error || error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    setVideo({ ...video, thumbnail_url: (data as any).thumbnail_url, thumbnail_locked: true });
  };

  const handleUpload = async (file: File) => {
    if (!video) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      await persistThumbnail(file, ext, file.type || "image/jpeg");
      toast.success("Vignette affectée et verrouillée");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const captureFrame = async () => {
    if (!video || !videoRef.current) return;
    const v = videoRef.current;
    if (!v.videoWidth || !v.videoHeight) {
      toast.error("Vidéo pas encore prête");
      return;
    }
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas non supporté");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Capture échouée"))), "image/jpeg", 0.92);
      });
      await persistThumbnail(blob, "jpg", "image/jpeg");
      toast.success(`Image capturée à ${v.currentTime.toFixed(1)}s et verrouillée`);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la capture (CORS ?)");
    } finally {
      setCapturing(false);
    }
  };

  const toggleLock = async () => {
    if (!video) return;
    const newLocked = !video.thumbnail_locked;
    const { data, error } = await supabase.functions.invoke("set-video-thumbnail", {
      body: { videoId: video.id, source: video.source, action: "lock", locked: newLocked },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Erreur");
      return;
    }
    setVideo({ ...video, thumbnail_locked: newLocked });
    toast.success(newLocked ? "Vignette verrouillée" : "Verrou retiré");
  };

  const embed = video ? getVideoEmbed(video.url, window.location.origin) : null;
  const isFile = embed?.type === "file";

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Vidéo ID — Vignette personnalisée</h3>
        <p className="text-xs text-muted-foreground">
          Recherche une vidéo par son UUID, navigue dans la vidéo pour capturer une image à un timestamp précis,
          ou uploade une image. Une vignette verrouillée 🔒 n'est jamais écrasée par le batch ni par les autres interfaces.
        </p>
      </div>

      <div className="flex gap-2 max-w-2xl">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">ID :</span> <span className="font-mono">{video.id}</span></div>
            <div><span className="text-muted-foreground">Source :</span> {video.source}</div>
            <div><span className="text-muted-foreground">Établissement :</span> {video.business_name || "—"}</div>
            <div className="md:col-span-3"><span className="text-muted-foreground">Nom :</span> {video.name || "—"}</div>
            <div className="md:col-span-3 break-all"><span className="text-muted-foreground">URL :</span> {video.url}</div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:[grid-template-columns:50%_50%]">
            {/* Lecteur vidéo + capture */}
            <div className="space-y-2 min-w-0">
              <Label className="text-xs">Lecteur vidéo — naviguer puis capturer</Label>
              <div className="bg-black rounded overflow-hidden aspect-video">
                {isFile ? (
                  <video
                    ref={videoRef}
                    src={video.url}
                    className="w-full h-full object-contain"
                    controls
                    crossOrigin="anonymous"
                    playsInline
                    onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                  />
                ) : embed ? (
                  <iframe
                    src={embed.embedUrl}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    style={{ border: 0 }}
                  />
                ) : null}
              </div>
              {isFile ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Position : <span className="font-mono font-semibold text-foreground">{currentTime.toFixed(2)}s</span>
                  </span>
                  <Button onClick={captureFrame} disabled={capturing} size="sm">
                    {capturing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                    Capturer cette image
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  ⚠️ Capture par timestamp disponible uniquement pour les vidéos hébergées en fichier (mp4/webm).
                  Pour YouTube/Vimeo, utilise l'upload manuel.
                </p>
              )}
            </div>

            {/* Vignette + upload + verrou */}
            <div className="space-y-3">
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
                size="sm"
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Uploader une image
              </Button>

              <Button
                variant={video.thumbnail_locked ? "default" : "outline"}
                size="sm"
                onClick={toggleLock}
                className="w-full"
              >
                {video.thumbnail_locked ? (
                  <><Lock className="h-3.5 w-3.5 mr-2" /> Verrouillée</>
                ) : (
                  <><Unlock className="h-3.5 w-3.5 mr-2" /> Non verrouillée</>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Capture et upload verrouillent automatiquement la vignette.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default VideoThumbnailLocker;
