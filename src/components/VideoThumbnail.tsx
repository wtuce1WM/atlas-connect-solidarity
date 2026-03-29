import { useEffect, useRef, useState } from "react";

interface VideoThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Generates a thumbnail from a hosted video by seeking to ~1s
 * to avoid black intro frames.
 */
const VideoThumbnail = ({ src, alt, className }: VideoThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    video.src = src;

    const handleSeeked = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbUrl(canvas.toDataURL("image/jpeg", 0.7));
        }
      } catch {
        setFailed(true);
      }
      video.remove();
    };

    const handleLoaded = () => {
      if (cancelled) return;
      // Seek to 1s or 25% of duration, whichever is smaller
      const seekTo = Math.min(1, video.duration * 0.25);
      video.currentTime = seekTo;
    };

    const handleError = () => {
      if (cancelled) return;
      setFailed(true);
    };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      video.remove();
    };
  }, [src]);

  if (thumbUrl) {
    return <img src={thumbUrl} alt={alt} className={className} />;
  }

  if (failed) {
    return (
      <div className={`${className} bg-white/10 flex items-center justify-center`}>
        <span className="text-2xl">▶</span>
      </div>
    );
  }

  // Loading state
  return <div className={`${className} bg-white/5 animate-pulse`} />;
};

export default VideoThumbnail;
