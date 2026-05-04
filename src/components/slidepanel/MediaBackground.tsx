import React from "react";
import { CalendarCheck } from "lucide-react";
import type { MediaItem } from "@/hooks/useMediaItems";

interface MediaBackgroundProps {
  effectiveMedia: MediaItem | null;
  businessName: string;
  videoInfo: any;
  isVerticalVideo: boolean;
  isSquareVideo: boolean;
  cardsHidden: boolean;
  externalVideoInteractiveMode: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
}

const MediaBackground = React.memo(function MediaBackground({
  effectiveMedia,
  businessName,
  videoInfo,
  isVerticalVideo,
  isSquareVideo,
  cardsHidden,
  externalVideoInteractiveMode,
  videoRef,
  iframeRef,
  onLoadedMetadata,
}: MediaBackgroundProps) {
  if (!effectiveMedia) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <CalendarCheck className="h-16 w-16 text-muted-foreground/40" />
      </div>
    );
  }

  if (effectiveMedia.kind === "video") {
    if (videoInfo?.type === "file") {
      return (
        <video
          ref={videoRef}
          key={effectiveMedia.url}
          src={effectiveMedia.url}
          className="w-full h-full bg-black object-contain"
          loop
          playsInline
          muted
          autoPlay
          onPlay={() => {
            if (videoRef.current) videoRef.current.muted = true;
          }}
          onLoadedMetadata={onLoadedMetadata}
        />
      );
    }

    return (
      <div className={`w-full h-full overflow-hidden bg-black ${videoInfo?.type === "youtube" ? "relative" : ""}`}>
        {videoInfo?.type === "youtube" && !isVerticalVideo && (
          <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
        )}
        <iframe
          ref={iframeRef}
          key={effectiveMedia.url}
          src={videoInfo?.embedUrl}
          className={
            videoInfo?.type === "youtube"
              ? isVerticalVideo
                ? `w-full h-full ${cardsHidden ? "" : "pointer-events-none"}`
                : `w-full h-full ${externalVideoInteractiveMode ? "" : "pointer-events-none"}`
              : `w-full h-full ${cardsHidden ? "" : "pointer-events-none"}`
          }
          allow="autoplay; encrypted-media"
          allowFullScreen
          frameBorder="0"
          style={{ border: 0 }}
        />
      </div>
    );
  }

  if (effectiveMedia.kind === "matterport") {
    return (
      <iframe
        key={effectiveMedia.url}
        src={effectiveMedia.url + (effectiveMedia.url.includes("?") ? "&" : "?") + "qs=0&hr=0&brand=0&help=0&gt=0&f=0&dh=0&title=0"}
        className="w-full h-full border-0"
        allow="xr-spatial-tracking"
        allowFullScreen
      />
    );
  }

  // image
  return <img src={effectiveMedia.url} alt={businessName} className="w-full h-full object-cover" />;
});

export default MediaBackground;
