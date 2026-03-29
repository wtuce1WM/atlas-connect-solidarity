import { useEffect, useState } from "react";

interface VideoThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
}

/** Check if a canvas frame is mostly black (avg brightness < threshold) */
function isFrameBlack(canvas: HTMLCanvasElement, threshold = 35): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let total = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  return total / pixels < threshold;
}

/**
 * Generates a thumbnail from a hosted video.
 * If the first frame is black, seeks to 2s for a better frame.
 */
const VideoThumbnail = ({ src, alt, className }: VideoThumbnailProps) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    video.src = src;

    const THUMB_W = 640;
    const THUMB_H = 360;

    const capture = () => {
      const canvas = document.createElement("canvas");
      const natW = video.videoWidth || THUMB_W;
      const natH = video.videoHeight || THUMB_H;
      // Scale down to thumbnail size, preserving aspect ratio
      const scale = Math.min(THUMB_W / natW, THUMB_H / natH, 1);
      canvas.width = Math.round(natW * scale);
      canvas.height = Math.round(natH * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas;
    };

    let triedSeek = false;

    const handleSeeked = () => {
      if (cancelled) return;
      try {
        const canvas = capture();
        if (canvas) {
          // If first attempt (time~0) is black, seek further
          if (!triedSeek && isFrameBlack(canvas)) {
            triedSeek = true;
            video.currentTime = Math.min(5, video.duration * 0.25);
            return; // will fire seeked again
          }
          setThumbUrl(canvas.toDataURL("image/jpeg", 0.7));
        }
      } catch {
        setFailed(true);
      }
      video.remove();
    };

    const handleLoaded = () => {
      if (cancelled) return;
      // Start at frame 0 to check if it's black
      video.currentTime = 1;
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

  return <div className={`${className} bg-white/5 animate-pulse`} />;
};

export default VideoThumbnail;
