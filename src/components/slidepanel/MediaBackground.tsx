import React, { useEffect, useRef } from "react";
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
  // Même stratégie que VideoSlidePanel : le CTA son met à jour le lecteur
  // directement. La préférence reste lisible par les effets via une ref, sans
  // redémarrer leur cycle cleanup → pause/mute → play à chaque clic.
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  // Vidéos natives : AUCUNE logique de lecture/son ici. Le moteur unique
  // (usePanelVideoPlayback, appelé par le panneau parent) est la seule source de
  // vérité pour play/pause, mute et les retries d'autoplay.

  // For YouTube iframes, proactively unmute on mount when the user preference is sound-on.
  // The embed URL is generated with mute=0 already, but browsers may still start muted; this
  // postMessage acts as a belt-and-braces guarantee that the slidepanel video plays with sound.
  useEffect(() => {
    if (effectiveMedia?.kind !== "video" || videoInfo?.type !== "youtube") return;
    if (anyOverlayOpen || !soundOnRef.current) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const post = (func: string, args: unknown[] = []) => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    };
    const send = () => {
      try {
        post("unMute");
        post("setVolume", [100]);
        post("playVideo");
      } catch {/* ignore */}
    };
    // Send a few times to cover the player's onReady timing window.
    const t1 = setTimeout(send, 200);
    const t2 = setTimeout(send, 800);
    const t3 = setTimeout(send, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      try {
        post("mute");
        post("setVolume", [0]);
        post("pauseVideo");
      } catch {/* ignore */}
    };
  }, [effectiveMedia?.url, effectiveMedia?.kind, videoInfo?.type, iframeRef, anyOverlayOpen]);

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
        <FrozenFrameVideo
          videoRef={videoRef}
          src={effectiveMedia.url}
          videoKey={effectiveMedia.url}
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