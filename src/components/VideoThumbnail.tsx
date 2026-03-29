import { useEffect, useRef, useState } from "react";

interface VideoThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
}

/** Check if a canvas frame is mostly black (avg brightness < threshold) */
function isFrameBlack(canvas: HTMLCanvasElement, threshold = 35): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let total = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    return total / pixels < threshold;
  } catch {
    // getImageData fails on tainted canvas (CORS)
    return false;
  }
}

/**
 * Generates a thumbnail from a hosted video.
 * Uses canvas capture with CORS fallback to a frozen <video> element.
 */
const VideoThumbnail = ({ src, alt, className }: VideoThumbnailProps) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [useVideoEl, setUseVideoEl] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    // Try with crossOrigin first for canvas capture
    video.crossOrigin = "anonymous";
    video.src = src;

    const THUMB_W = 1280;
    const THUMB_H = 720;

    const capture = (): string | null => {
      try {
        const canvas = document.createElement("canvas");
        const natW = video.videoWidth || THUMB_W;
        const natH = video.videoHeight || THUMB_H;
        const scale = Math.min(THUMB_W / natW, THUMB_H / natH, 1);
        canvas.width = Math.round(natW * scale);
        canvas.height = Math.round(natH * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Test if canvas is tainted by trying to read pixels
        ctx.getImageData(0, 0, 1, 1);
        if (isFrameBlack(canvas)) return null; // signal to retry
        return canvas.toDataURL("image/jpeg", 0.7);
      } catch {
        // Canvas is tainted (CORS) — fall back to video element
        return "TAINTED";
      }
    };

    let triedSeek = false;
    let triedNoCors = false;

    const handleSeeked = () => {
      if (cancelled) return;
      const result = capture();
      if (result === "TAINTED") {
        // CORS issue — fall back to displaying a real <video> element
        video.remove();
        if (!cancelled) setUseVideoEl(true);
        return;
      }
      if (result === null && !triedSeek) {
        // Frame is black, try further in the video
        triedSeek = true;
        video.currentTime = Math.min(5, video.duration * 0.25);
        return;
      }
      if (result) {
        if (!cancelled) setThumbUrl(result);
      } else {
        // Still black after retry — just use whatever we have
        try {
          const canvas = document.createElement("canvas");
          const natW = video.videoWidth || THUMB_W;
          const natH = video.videoHeight || THUMB_H;
          const scale = Math.min(THUMB_W / natW, THUMB_H / natH, 1);
          canvas.width = Math.round(natW * scale);
          canvas.height = Math.round(natH * scale);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (!cancelled) setThumbUrl(canvas.toDataURL("image/jpeg", 0.7));
          } else {
            if (!cancelled) setUseVideoEl(true);
          }
        } catch {
          if (!cancelled) setUseVideoEl(true);
        }
      }
      video.remove();
    };

    const handleLoaded = () => {
      if (cancelled) return;
      video.currentTime = 3;
    };

    const handleError = () => {
      if (cancelled) return;
      // If crossOrigin caused the error, retry without it using video element fallback
      if (!triedNoCors) {
        triedNoCors = true;
        video.remove();
        if (!cancelled) setUseVideoEl(true);
        return;
      }
    };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);

    // Timeout: if nothing happens in 8s, fall back to video element
    const timeout = setTimeout(() => {
      if (!cancelled && !thumbUrl) {
        video.remove();
        setUseVideoEl(true);
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      video.remove();
    };
  }, [src]);

  // Fallback: frozen <video> element at 3s
  useEffect(() => {
    if (!useVideoEl || !videoRef.current) return;
    const v = videoRef.current;
    const onLoaded = () => {
      v.currentTime = 3;
    };
    const onSeeked = () => {
      v.pause();
      setVideoReady(true);
    };
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [useVideoEl]);

  if (thumbUrl) {
    return <img src={thumbUrl} alt={alt} className={className} />;
  }

  if (useVideoEl) {
    return (
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        className={`${className} ${videoReady ? '' : 'opacity-0'}`}
        style={{ pointerEvents: "none" }}
      />
    );
  }

  return <div className={`${className} bg-white/5 animate-pulse`} />;
};

export default VideoThumbnail;
