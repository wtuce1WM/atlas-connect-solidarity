/**
 * Inline thumbnail assignment panel for the right-side drawer.
 *
 * Mirrors the standalone VideoThumbnailLocker but pre-loaded with a known
 * video, supporting `generic_videos`, `business_documents` and
 * `business_youtube_videos` sources.
 *
 * For YouTube videos we store the user-chosen image in `custom_thumbnail_url`
 * (kept separate from the auto-fetched `thumbnail` column) and flip
 * `thumbnail_locked = true` so syncs never overwrite it.
 */

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Lock, Unlock, AlertCircle, Camera, X, Check } from "lucide-react";
import { toast } from "sonner";
import { getVideoEmbed } from "@/lib/videoEmbed";

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

/** Candidate thumbnails YouTube exposes for any public video. */
const youtubeThumbnailCandidates = (ytId: string) => [
  { key: "maxres",  label: "Max résolution",     url: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` },
  { key: "hq",      label: "Haute qualité",      url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` },
  { key: "sd",      label: "Définition standard",url: `https://img.youtube.com/vi/${ytId}/sddefault.jpg` },
  { key: "frame1",  label: "Frame ~25%",         url: `https://img.youtube.com/vi/${ytId}/1.jpg` },
  { key: "frame2",  label: "Frame ~50%",         url: `https://img.youtube.com/vi/${ytId}/2.jpg` },
  { key: "frame3",  label: "Frame ~75%",         url: `https://img.youtube.com/vi/${ytId}/3.jpg` },
];

export type ThumbnailSource = "business_documents" | "generic_videos" | "business_youtube_videos";

interface Props {
  source: ThumbnailSource;
  videoId: string;
  /** Original video URL (for the embedded player). */
  videoUrl: string;
  /** Display name. */
  videoName?: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const InlineThumbnailAssignment = ({
  source, videoId, videoUrl, videoName, onClose, onSaved,
}: Props) => {
  const [loading, setLoading] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailLocked, setThumbnailLocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /** Column name that stores the displayed thumbnail per source. */
  const thumbCol = source === "business_youtube_videos" ? "custom_thumbnail_url" : "thumbnail_url";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from(source)
        .select(`${thumbCol}, thumbnail_locked${source === "business_youtube_videos" ? ", thumbnail" : ""}`)
        .eq("id", videoId)
        .maybeSingle();
      if (!alive) return;
      if (data) {
        // For YouTube, fall back to auto thumbnail if no custom one yet
        const fallback = source === "business_youtube_videos" ? (data as any).thumbnail : null;
        setThumbnailUrl((data as any)[thumbCol] || fallback || null);
        setThumbnailLocked(!!(data as any).thumbnail_locked);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [source, videoId, thumbCol]);

  const persistThumbnail = async (publicUrl: string) => {
    const { error } = await (supabase as any)
      .from(source)
      .update({ [thumbCol]: publicUrl, thumbnail_locked: true })
      .eq("id", videoId);
    if (error) throw error;
    setThumbnailUrl(publicUrl);
    setThumbnailLocked(true);
    onSaved?.();
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `thumbs/manual-${source}-${videoId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("business-images")
        .upload(path, file, { cacheControl: "31536000", upsert: true, contentType: file.type || "image/jpeg" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("business-images").getPublicUrl(path);
      await persistThumbnail(urlData.publicUrl);
      toast.success("Vignette affectée et verrouillée");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
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
      const path = `thumbs/frame-${source}-${videoId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("business-images")
        .upload(path, blob, { cacheControl: "31536000", upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("business-images").getPublicUrl(path);
      await persistThumbnail(urlData.publicUrl);
      toast.success(`Image capturée à ${v.currentTime.toFixed(1)}s et verrouillée`);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la capture (CORS ?)");
    } finally {
      setCapturing(false);
    }
  };

  const toggleLock = async () => {
    const newLocked = !thumbnailLocked;
    const { error } = await (supabase as any)
      .from(source)
      .update({ thumbnail_locked: newLocked })
      .eq("id", videoId);
    if (error) { toast.error(error.message); return; }
    setThumbnailLocked(newLocked);
    onSaved?.();
    toast.success(newLocked ? "Vignette verrouillée" : "Verrou retiré");
  };

  const embed = getVideoEmbed(videoUrl, window.location.origin);
  const isFile = embed?.type === "file";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Vignette personnalisée</h3>
          <p className="text-xs text-muted-foreground truncate">{videoName || videoUrl}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Player */}
            <div className="space-y-2">
              <Label className="text-xs">Lecteur — naviguer puis capturer</Label>
              <div className="bg-black rounded overflow-hidden aspect-video">
                {isFile ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
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
                  ⚠️ Capture par timestamp uniquement pour les vidéos hébergées (mp4/webm).
                  Pour YouTube/Vimeo, utilise l'upload manuel.
                </p>
              )}
            </div>

            {/* Current thumbnail */}
            <div>
              <Label className="text-xs">Vignette actuelle</Label>
              <div className="mt-1 aspect-video bg-muted rounded overflow-hidden flex items-center justify-center">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Aucune vignette
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-2">
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
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full" size="sm">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Uploader une image
              </Button>
              <Button variant={thumbnailLocked ? "default" : "outline"} size="sm" onClick={toggleLock} className="w-full">
                {thumbnailLocked
                  ? <><Lock className="h-3.5 w-3.5 mr-2" /> Verrouillée</>
                  : <><Unlock className="h-3.5 w-3.5 mr-2" /> Non verrouillée</>}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Capture et upload verrouillent automatiquement la vignette.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InlineThumbnailAssignment;
