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

  // Try to honor the user's sound preference; fall back to muted if the browser
  // blocks autoplay-with-sound.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || effectiveMedia?.kind !== "video" || videoInfo?.type !== "file") return;
    if (anyOverlayOpen) {
      v.pause();
      return;
    }
    delete v.dataset.owmUserPaused;
    v.muted = !soundOnRef.current;
    let disposed = false;
    let autoplayFallbackMuted = false;
    const attemptPlay = () => {
      if (disposed) return;
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch((error: unknown) => {
          if (disposed) return;
          // Un swipe rapide remplace la source pendant que play() est encore en
          // attente. Safari renvoie alors AbortError : ce n'est pas un refus
          // d'autoplay et il ne faut surtout pas basculer la vidéo en mute.
          if ((error as { name?: string })?.name === "AbortError") {
            window.setTimeout(() => { if (!disposed) attemptPlay(); }, 120);
            return;
          }
          // Only fall back to muted playback when the browser really blocked autoplay.
          // Other transient media errors during a swipe must not change the sound state.
          const errorName = (error as { name?: string })?.name;
          if (errorName !== "NotAllowedError" && errorName !== "SecurityError") return;
          // If the video is already playing, re-muting here would silently override the
          // user's explicit Mute/Sound choice (single source of truth = soundOn).
          if (!v.paused) return;
          autoplayFallbackMuted = true;
          v.dataset.owmAutoMute = "1";
          v.muted = true;
          v.play().then(() => {
            // A swipe is a user gesture: as soon as muted playback has started,
            // restore the requested sound instead of leaving the next item muted.
            if (disposed || !soundOnRef.current || !autoplayFallbackMuted) return;
            autoplayFallbackMuted = false;
            v.muted = false;
            v.volume = 1;
          }).catch(() => {});
          // volumechange est asynchrone : on garde le drapeau assez longtemps
          // pour que les listeners ne prennent pas ce mute automatique pour un choix utilisateur.
          window.setTimeout(() => { delete v.dataset.owmAutoMute; }, 800);
        });
      }
    };
    attemptPlay();

    // iOS/Safari met parfois la vidéo en pause lors d'un changement de source
    // rapide (swipe entre fiches). On relance tant que l'utilisateur n'a pas
    // explicitement appuyé sur Pause.
    const recover = () => {
      if (v.dataset.owmUserPaused === "1") return;
      if (!v.paused) return;
      attemptPlay();
    };
    v.addEventListener("canplay", recover);
    v.addEventListener("loadeddata", recover);
    v.addEventListener("pause", recover);
    const timers = [300, 900, 2000].map((ms) => window.setTimeout(recover, ms));

    const cleanupPlay = () => {
      disposed = true;
      // Le panneau peut être retiré du DOM sans passer par un overlay. Arrêter
      // explicitement l'ancien élément capturé empêche son audio de continuer
      // après la fermeture ou pendant le remplacement d'une fiche.
      v.pause();
      // Le mute de destruction est technique. Le listener volumechange du
      // panneau parent peut encore être attaché pendant le démontage : sans ce
      // drapeau il persistait parfois « son coupé » au passage au résultat 2.
      v.dataset.owmAutoMute = "1";
      v.muted = true;
      v.removeEventListener("canplay", recover);
      v.removeEventListener("loadeddata", recover);
      v.removeEventListener("pause", recover);
      timers.forEach((t) => window.clearTimeout(t));
    };

    // If the browser forced mute (autoplay policy), unmute on the next user gesture.
    if (!soundOnRef.current) return cleanupPlay;
    const tryUnmute = (event: Event) => {
      // Même garde que VideoSlidePanel : le geste sur le CTA Sound/Mute doit
      // être traité uniquement par son onClick. Sans cela, le listener global
      // dé-mute au touchstart puis le CTA inverse encore l'état au click,
      // particulièrement après le remplacement de la vidéo lors d'un swipe.
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-sound-toggle="true"]')) return;
      if (!v.muted) return;
      autoplayFallbackMuted = false;
      v.muted = false;
      v.volume = 1;
      v.play().catch(() => {});
    };
    const opts: AddEventListenerOptions = { once: true, capture: true };
    document.addEventListener("pointerdown", tryUnmute, opts);
    document.addEventListener("touchstart", tryUnmute, opts);
    document.addEventListener("keydown", tryUnmute, opts);
    return () => {
      cleanupPlay();
      document.removeEventListener("pointerdown", tryUnmute, true);
      document.removeEventListener("touchstart", tryUnmute, true);
      document.removeEventListener("keydown", tryUnmute, true);
    };
  }, [effectiveMedia?.url, effectiveMedia?.kind, videoInfo?.type, videoRef, anyOverlayOpen]);

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