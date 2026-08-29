import React, { useEffect } from "react";
import { CalendarCheck } from "lucide-react";
import type { MediaItem } from "@/hooks/useMediaItems";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";

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
  anyOverlayOpen?: boolean;
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
  anyOverlayOpen = false,
}: MediaBackgroundProps) {
  const { soundOn } = useVideoSoundPreference();

  // Try to honor the user's sound preference; fall back to muted if the browser
  // blocks autoplay-with-sound.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || effectiveMedia?.kind !== "video" || videoInfo?.type !== "file") return;
    if (anyOverlayOpen) {
      v.pause();
      return;
    }
    v.muted = !soundOn;
    const tryPlay = v.play();
    if (tryPlay && typeof tryPlay.catch === "function") {
      tryPlay.catch(() => {
        // Only fall back to muted playback when the browser really blocked playback.
        // If the video is already playing, re-muting here would silently override the
        // user's explicit Mute/Sound choice (single source of truth = soundOn).
        if (!v.paused) return;
        v.dataset.owmAutoMute = "1";
        v.muted = true;
        v.play().catch(() => {});
        // volumechange est asynchrone : on garde le drapeau assez longtemps
        // pour que les listeners ne prennent pas ce mute automatique pour un choix utilisateur.
        window.setTimeout(() => { delete v.dataset.owmAutoMute; }, 800);
      });
    }


    // If the browser forced mute (autoplay policy), unmute on the next user gesture.
    if (!soundOn) return;
    const tryUnmute = () => {
      if (!v.muted) return;
      v.muted = false;
      v.play().catch(() => {});
    };
    const opts: AddEventListenerOptions = { once: true, capture: true };
    document.addEventListener("pointerdown", tryUnmute, opts);
    document.addEventListener("touchstart", tryUnmute, opts);
    document.addEventListener("keydown", tryUnmute, opts);
    return () => {
      document.removeEventListener("pointerdown", tryUnmute, true);
      document.removeEventListener("touchstart", tryUnmute, true);
      document.removeEventListener("keydown", tryUnmute, true);
    };
  }, [soundOn, effectiveMedia?.url, effectiveMedia?.kind, videoInfo?.type, videoRef, anyOverlayOpen]);

  // For YouTube iframes, proactively unmute on mount when the user preference is sound-on.
  // The embed URL is generated with mute=0 already, but browsers may still start muted; this
  // postMessage acts as a belt-and-braces guarantee that the slidepanel video plays with sound.
  useEffect(() => {
    if (effectiveMedia?.kind !== "video" || videoInfo?.type !== "youtube") return;
    if (anyOverlayOpen || !soundOn) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => {
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "unMute", args: [] }),
          "*"
        );
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [100] }),
          "*"
        );
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      } catch {/* ignore */}
    };
    // Send a few times to cover the player's onReady timing window.
    const t1 = setTimeout(send, 200);
    const t2 = setTimeout(send, 800);
    const t3 = setTimeout(send, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [soundOn, effectiveMedia?.url, effectiveMedia?.kind, videoInfo?.type, iframeRef, anyOverlayOpen]);

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
          className="w-full h-full bg-black object-cover"
          loop
          playsInline
          autoPlay={!anyOverlayOpen}
          muted={!soundOn}
          onLoadedMetadata={onLoadedMetadata}
        />
      );
    }

    const isYouTubeVertical = videoInfo?.type === "youtube" && isVerticalVideo;
    const finalEmbedUrl = anyOverlayOpen
      ? videoInfo?.embedUrl?.replace("autoplay=1", "autoplay=0")?.replace("autoplay=true", "autoplay=false")
      : videoInfo?.embedUrl;

    return (
      <div
        className={`w-full h-full overflow-hidden bg-black ${videoInfo?.type === "youtube" ? "relative" : ""}`}
        style={isYouTubeVertical ? { containerType: "size" } : undefined}
      >
        {videoInfo?.type === "youtube" && !isVerticalVideo && (
          <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
        )}
        <iframe
          ref={iframeRef}
          key={effectiveMedia.url}
          src={finalEmbedUrl}
          className={
            videoInfo?.type === "youtube"
              ? isVerticalVideo
                ? `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${cardsHidden ? "" : "pointer-events-none"}`
                : `w-full h-full pointer-events-none`
              : `w-full h-full ${cardsHidden ? "" : "pointer-events-none"}`
          }
          allow={anyOverlayOpen ? "encrypted-media" : "autoplay; encrypted-media"}
          allowFullScreen
          frameBorder="0"
          style={
            isYouTubeVertical
              ? {
                  border: 0,
                  width: "max(100cqw, calc(100cqh * 9 / 16))",
                  height: "max(100cqh, calc(100cqw * 16 / 9))",
                }
              : { border: 0 }
          }
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