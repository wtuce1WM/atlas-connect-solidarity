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
  { key: "maxres",  label: "Max résolution",     url: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`, pct: null as number | null },
  { key: "hq",      label: "Haute qualité",      url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,    pct: null },
  { key: "sd",      label: "Définition standard",url: `https://img.youtube.com/vi/${ytId}/sddefault.jpg`,    pct: null },
  { key: "frame1",  label: "Frame ~25%",         url: `https://img.youtube.com/vi/${ytId}/1.jpg`,            pct: 25 },
  { key: "frame2",  label: "Frame ~50%",         url: `https://img.youtube.com/vi/${ytId}/2.jpg`,            pct: 50 },
  { key: "frame3",  label: "Frame ~75%",         url: `https://img.youtube.com/vi/${ytId}/3.jpg`,            pct: 75 },
];

/** Lazy-load YouTube IFrame API once. */
let ytApiPromise: Promise<any> | null = null;
const loadYouTubeApi = (): Promise<any> => {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).YT?.Player) return Promise.resolve((window as any).YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve((window as any).YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
};

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
  const [ytDuration, setYtDuration] = useState(0);
  const [ytTime, setYtTime] = useState(0);
  const [ytReady, setYtReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPollRef = useRef<number | null>(null);

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

  /** Download a YouTube thumbnail and re-host it in our storage so the lock is stable. */
  const pickYouTubeThumbnail = async (sourceUrl: string) => {
    setUploading(true);
    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`Image indisponible (HTTP ${res.status})`);
      const blob = await res.blob();
      // YouTube returns a 120×90 grey placeholder when the requested size doesn't exist.
      if (blob.size < 2000) throw new Error("Cette résolution n'est pas disponible pour cette vidéo");
      const path = `thumbs/yt-${videoId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("business-images")
        .upload(path, blob, { cacheControl: "31536000", upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("business-images").getPublicUrl(path);
      await persistThumbnail(urlData.publicUrl);
      toast.success("Vignette YouTube sélectionnée et verrouillée");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la récupération");
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

  /** Pick the YT-provided frame thumbnail (1/2/3.jpg) closest to current YT player time. */
  const captureClosestYouTubeFrame = async () => {
    if (!ytId || !ytPlayerRef.current || !ytDuration) {
      toast.error("Lecteur YouTube pas encore prêt");
      return;
    }
    const t = typeof ytPlayerRef.current.getCurrentTime === "function"
      ? ytPlayerRef.current.getCurrentTime() : ytTime;
    const pct = (t / ytDuration) * 100;
    const targets = [
      { pct: 25, url: `https://img.youtube.com/vi/${ytId}/1.jpg` },
      { pct: 50, url: `https://img.youtube.com/vi/${ytId}/2.jpg` },
      { pct: 75, url: `https://img.youtube.com/vi/${ytId}/3.jpg` },
    ];
    const best = targets.reduce((a, b) => Math.abs(b.pct - pct) < Math.abs(a.pct - pct) ? b : a);
    toast.info(`Frame YouTube la plus proche : ~${best.pct}% (position ${pct.toFixed(0)}%)`);
    await pickYouTubeThumbnail(best.url);
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
  const ytId = extractYouTubeId(videoUrl);
  const ytCandidates = ytId ? youtubeThumbnailCandidates(ytId) : [];

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
              ) : ytId ? null : (
                <p className="text-[11px] text-muted-foreground">
                  ⚠️ Capture par timestamp uniquement pour les vidéos hébergées (mp4/webm).
                </p>
              )}
            </div>

            {/* YouTube thumbnail picker */}
            {ytId && (
              <div className="space-y-2">
                <Label className="text-xs">Choisir une image proposée par YouTube</Label>
                <p className="text-[11px] text-muted-foreground">
                  Cliquez sur une vignette pour la sélectionner. Les 3 dernières sont des frames extraites à 25%, 50% et 75% de la vidéo.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {ytCandidates.map((c) => {
                    const isSelected = thumbnailUrl?.includes(`/${ytId}/`) || (thumbnailUrl?.endsWith(c.url.split("/").pop()!) ?? false);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        disabled={uploading}
                        onClick={() => pickYouTubeThumbnail(c.url)}
                        className={
                          "group relative aspect-video bg-black rounded overflow-hidden border-2 transition " +
                          (isSelected ? "border-primary" : "border-transparent hover:border-muted-foreground/50")
                        }
                        title={c.label}
                      >
                        <img
                          src={c.url}
                          alt={c.label}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">
                          {c.label}
                        </div>
                        {uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
