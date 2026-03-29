import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Image, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/** Generate a JPEG thumbnail blob from a video URL (client-side canvas capture). */
function generateVideoThumbnail(videoUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.src = videoUrl;

    const timeout = setTimeout(() => { video.remove(); resolve(null); }, 12000);

    const capture = () => {
      try {
        const THUMB_W = 1280, THUMB_H = 720;
        const natW = video.videoWidth || THUMB_W;
        const natH = video.videoHeight || THUMB_H;
        const scale = Math.min(THUMB_W / natW, THUMB_H / natH, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(natW * scale);
        canvas.height = Math.round(natH * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let total = 0;
        const pixels = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
        return total / pixels < 35 ? null : canvas;
      } catch { return null; }
    };

    let triedSeek = false;

    const handleSeeked = () => {
      const canvas = capture();
      if (!canvas && !triedSeek) {
        triedSeek = true;
        video.currentTime = Math.min(5, video.duration * 0.25);
        return;
      }
      clearTimeout(timeout);
      if (canvas) {
        canvas.toBlob((blob) => { video.remove(); resolve(blob); }, "image/jpeg", 0.75);
      } else {
        // Force capture
        try {
          const c = document.createElement("canvas");
          c.width = video.videoWidth || 1280;
          c.height = video.videoHeight || 720;
          const ctx2 = c.getContext("2d");
          if (ctx2) {
            ctx2.drawImage(video, 0, 0, c.width, c.height);
            c.toBlob((blob) => { video.remove(); resolve(blob); }, "image/jpeg", 0.75);
          } else { video.remove(); resolve(null); }
        } catch { video.remove(); resolve(null); }
      }
    };

    const handleLoaded = () => { video.currentTime = 3; };
    const handleError = () => { clearTimeout(timeout); video.remove(); resolve(null); };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
  });
}

const BatchThumbnailGenerator = () => {
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [succeeded, setSucceeded] = useState(0);
  const [failed, setFailed] = useState(0);
  const cancelRef = useRef(false);
  const { toast } = useToast();

  const run = useCallback(async () => {
    cancelRef.current = false;
    setRunning(true);
    setProcessed(0);
    setSucceeded(0);
    setFailed(0);

    // Fetch all video docs without thumbnail that are NOT youtube/vimeo
    const { data: docs, error } = await supabase
      .from("business_documents")
      .select("id, url")
      .eq("type", "video")
      .is("thumbnail_url", null)
      .not("url", "ilike", "%youtube.com%")
      .not("url", "ilike", "%youtu.be%")
      .not("url", "ilike", "%vimeo.com%")
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error || !docs) {
      toast({ variant: "destructive", title: "Erreur", description: error?.message || "Impossible de charger les vidéos." });
      setRunning(false);
      return;
    }

    setTotal(docs.length);
    if (docs.length === 0) {
      toast({ title: "Terminé", description: "Toutes les vignettes sont déjà générées !" });
      setRunning(false);
      return;
    }

    let ok = 0, fail = 0;
    const CONCURRENCY = 4;

    const processOne = async (doc: { id: string; url: string }) => {
      if (cancelRef.current) return;
      try {
        const blob = await generateVideoThumbnail(doc.url);
        if (!blob) { fail++; setFailed(f => f + 1); setProcessed(p => p + 1); return; }

        const thumbName = `thumbs/batch-${doc.id}-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("business-images")
          .upload(thumbName, blob, { cacheControl: "31536000", upsert: true, contentType: "image/jpeg" });

        if (upErr) { fail++; setFailed(f => f + 1); setProcessed(p => p + 1); return; }

        const { data: urlData } = supabase.storage.from("business-images").getPublicUrl(thumbName);
        if (urlData?.publicUrl) {
          await supabase.from("business_documents").update({ thumbnail_url: urlData.publicUrl }).eq("id", doc.id);
          ok++;
          setSucceeded(s => s + 1);
        } else {
          fail++;
          setFailed(f => f + 1);
        }
      } catch {
        fail++;
        setFailed(f => f + 1);
      }
      setProcessed(p => p + 1);
    };

    // Process in parallel batches
    for (let i = 0; i < docs.length; i += CONCURRENCY) {
      if (cancelRef.current) break;
      const batch = docs.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(processOne));
    }

    toast({
      title: cancelRef.current ? "Interrompu" : "Terminé",
      description: `${ok} vignettes générées, ${fail} échecs sur ${docs.length} vidéos.`,
    });
    setRunning(false);
  }, [toast]);

  const cancel = () => { cancelRef.current = true; };

  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Image className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Génération batch des vignettes vidéo</h3>
      </div>

      {!running && processed === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Génère les vignettes manquantes pour les vidéos hébergées (fichiers MP4, WebM…).
            Les vidéos YouTube et Vimeo ont déjà leurs vignettes.
          </p>
          <Button size="sm" onClick={run}>
            <Image className="h-4 w-4 mr-1" /> Lancer la génération
          </Button>
        </div>
      )}

      {running && (
        <div className="space-y-2">
          <Progress value={pct} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {processed}/{total} ({pct}%)
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />{succeeded}</span>
              <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" />{failed}</span>
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={cancel}>Arrêter</Button>
        </div>
      )}

      {!running && processed > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />{succeeded} OK</span>
            <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" />{failed} échecs</span>
          </div>
          <Button size="sm" variant="outline" onClick={run}>Relancer</Button>
        </div>
      )}
    </div>
  );
};

export default BatchThumbnailGenerator;
