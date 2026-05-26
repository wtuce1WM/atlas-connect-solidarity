import { useState, useRef, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Play, Pause, Volume2, VolumeX, ExternalLink } from "lucide-react";
import { InstagramIcon } from "@/components/staff/SocialMediaIcons";
import { getVideoEmbed } from "@/lib/videoEmbed";
import type { VideoDoc } from "@/hooks/useBookOnlineData";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";
import { useIsMobile } from "@/hooks/use-mobile";

export interface VideoOverlayControlsApi {
  isPlaying: boolean;
  isMuted: boolean;
  isFile: boolean;
  togglePlay: () => void;
  toggleMute: () => void;
}

interface VideoDocumentOverlayProps {
  activeVideo: { url: string; name: string | null; description: string | null };
  videoDocs: VideoDoc[];
  closing: boolean;
  defaultSoundOn?: boolean;
  businessId?: string;
  businessName?: string;
  onClose: () => void;
  onNavigate: (video: { url: string; name: string | null; description: string | null }) => void;
  onAnimationEnd: () => void;
  onOwnerClick?: (ownerId: string) => void;
  onControlsApi?: (api: VideoOverlayControlsApi | null) => void;
}

const VideoDocumentOverlay = ({
  activeVideo,
  videoDocs,
  closing,
  defaultSoundOn = true,
  businessId,
  businessName,
  onClose,
  onNavigate,
  onAnimationEnd,
  onOwnerClick,
  onControlsApi,
}: VideoDocumentOverlayProps) => {
  // User's persisted sound preference takes precedence over the per-business default.
  const { soundOn, setSoundOn } = useVideoSoundPreference();
  const [descExpanded, setDescExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(!soundOn);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const postCmd = useCallback((func: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func }),
      "*"
    );
  }, []);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
    } else {
      postCmd(isPlaying ? "pauseVideo" : "playVideo");
    }
    setIsPlaying(p => !p);
  }, [isPlaying, postCmd]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    if (videoRef.current) {
      videoRef.current.muted = next;
    } else {
      postCmd(next ? "mute" : "unMute");
    }
    setIsMuted(next);
    // Persist user's choice across all videos / panels / sessions
    setSoundOn(!next);
  }, [isMuted, postCmd, setSoundOn]);

  const vidUrl = activeVideo.url;
  const currentIdx = videoDocs.findIndex(v => v.url === vidUrl);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < videoDocs.length - 1;

  const goTo = (idx: number) => {
    const v = videoDocs[idx];
    if (v) {
      onNavigate({ url: v.url, name: v.name, description: v.description });
      setDescExpanded(false);
      setIsPlaying(true);
      setIsMuted(!soundOn);
    }
  };

  const overlayVid = getVideoEmbed(vidUrl, window.location.origin);
  const muteVal = soundOn ? "0" : "1";
  const overlayEmbedUrl = overlayVid.type === "youtube"
    ? overlayVid.embedUrl.replace(/mute=\d/, `mute=${muteVal}`).replace(/loop=\d/, "loop=1").replace(/controls=\d/, "controls=1") + `&playlist=${vidUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/)?.[1] || ""}`
    : overlayVid.type === "vimeo"
      ? overlayVid.embedUrl.replace(/muted=\d/, soundOn ? "muted=0" : "muted=1").replace(/loop=\d/, "loop=1")
      : overlayVid.type === "bunny"
        ? overlayVid.embedUrl.replace(/loop=false/, "loop=true")
        : overlayVid.embedUrl;
  const isVerticalHint = overlayVid.isVertical;
  const isFile = overlayVid.type === "file";

  // Expose controls API to parent so it can render the buttons inline (e.g. in the search bar row).
  useEffect(() => {
    if (!onControlsApi) return;
    onControlsApi({ isPlaying, isMuted, isFile, togglePlay, toggleMute });
    return () => onControlsApi(null);
  }, [onControlsApi, isPlaying, isMuted, isFile, togglePlay, toggleMute]);



  // Vertical swipe nav (mobile) — same behavior as SlidePanelHome
  const isMobile = useIsMobile();
  const swipeStartY = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeHandled = useRef(false);
  const swipeEnabled = isMobile && !descExpanded;
  const resetSwipe = () => {
    swipeStartY.current = null;
    swipeStartX.current = null;
    swipeHandled.current = false;
  };

  return (
    <div
      className="absolute inset-0 z-[85] overflow-hidden"
      style={swipeEnabled ? { touchAction: "none", overscrollBehavior: "contain" } : undefined}
      onTouchStart={swipeEnabled ? (e) => {
        if (e.touches.length !== 1) return;
        swipeStartY.current = e.touches[0].clientY;
        swipeStartX.current = e.touches[0].clientX;
        swipeHandled.current = false;
      } : undefined}
      onTouchMove={swipeEnabled ? (e) => {
        if (swipeHandled.current || swipeStartY.current === null || swipeStartX.current === null) return;
        const dy = e.touches[0].clientY - swipeStartY.current;
        const dx = e.touches[0].clientX - swipeStartX.current;
        if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) {
          if (dy < 0 && hasNext) {
            e.preventDefault();
            swipeHandled.current = true;
            goTo(currentIdx + 1);
          } else if (dy > 0 && hasPrev) {
            e.preventDefault();
            swipeHandled.current = true;
            goTo(currentIdx - 1);
          }
        }
      } : undefined}
      onTouchEnd={swipeEnabled ? resetSwipe : undefined}
      onTouchCancel={swipeEnabled ? resetSwipe : undefined}
    >
    <div
      className={`absolute inset-0 bg-black overflow-hidden ${closing ? 'animate-slide-out-bottom' : 'animate-slide-in-left'}`}
      onAnimationEnd={() => { if (closing) onAnimationEnd(); }}
    >
      {/* Top bar: close + mobile nav with counter */}
      <div className="absolute top-3 left-3 right-3 z-50 flex items-center">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/80 transition-colors shadow-lg shrink-0"
        >
          <X className="h-4 w-4" />
        </button>

        {videoDocs.length > 1 && (
          <span className="md:hidden text-white text-sm font-medium tabular-nums flex-1 text-center">
            {currentIdx + 1} / {videoDocs.length}
          </span>
        )}
        {videoDocs.length <= 1 && <div className="flex-1 md:hidden" />}
        <div className="w-9 shrink-0 md:hidden" />
      </div>

      {/* Centered chevrons — all devices */}
      {hasPrev && (
        <button
          onClick={() => goTo(currentIdx - 1)}
          className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white items-center justify-center hover:bg-white/80 transition-colors shadow-lg ${descExpanded ? 'hidden md:flex' : 'flex'}`}
          aria-label="Vidéo précédente"
        >
          <ChevronLeft className="h-5 w-5 text-black" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => goTo(currentIdx + 1)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white items-center justify-center hover:bg-white/80 transition-colors shadow-lg ${descExpanded ? 'hidden md:flex' : 'flex'}`}
          aria-label="Vidéo suivante"
        >
          <ChevronRight className="h-5 w-5 text-black" />
        </button>
      )}

      {/* Video — full overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isFile ? (
          <video
            ref={videoRef}
            src={vidUrl}
            className="w-full h-full bg-black object-cover"
            autoPlay
            loop
            playsInline
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              v.className = `w-full h-full bg-black ${v.videoHeight > v.videoWidth ? "object-cover" : "object-contain"}`;
            }}
          />
        ) : (
            <div className={`w-full h-full overflow-hidden bg-black ${overlayVid.type === "youtube" ? "relative" : ""}`}>
            {overlayVid.type === "youtube" && !isVerticalHint && (
              <>
                <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
              </>
            )}
            <iframe
              ref={iframeRef}
              src={overlayEmbedUrl}
              className={overlayVid.type === "youtube"
                ? isVerticalHint
                  ? "w-full h-full"
                  : "w-full h-[calc(100%+80px)] -mt-16 -mb-[46px]"
                : "w-full h-full"
              }
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Owner logo + badge */}
      {(() => {
        const currentVideoDoc = videoDocs.find(d => d.url === vidUrl);
        if (!currentVideoDoc?.owner_business_id || currentVideoDoc.owner_business_id === businessId) return null;
        return (
          <div className="absolute bottom-40 left-0 right-0 z-20 flex flex-col items-center pointer-events-none">
            {currentVideoDoc.owner_logo && (
              <div className="shrink-0 flex justify-center pointer-events-none pb-4">
                <div className="animate-logo-big-full-reveal max-w-[140px] max-h-[110px] md:max-w-[240px] md:max-h-[160px]">
                  <img
                    src={currentVideoDoc.owner_logo}
                    alt={currentVideoDoc.owner_name || ''}
                    className="max-w-full max-h-[110px] md:max-h-[160px] object-contain"
                    style={{ filter: 'drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))' }}
                  />
                </div>
              </div>
            )}
            {currentVideoDoc.owner_name && (
              <div className="shrink-0 flex justify-center pointer-events-auto pb-4">
                <button
                  onClick={() => onOwnerClick?.(currentVideoDoc.owner_business_id!)}
                  className="flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 hover:bg-black/85 transition-colors animate-cta-zoom-in"
                >
                  <span className="text-xs font-medium text-white" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                    {currentVideoDoc.owner_name} <span className="text-base">©</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/60 shrink-0" />
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Custom Play/Pause + Mute controls — only for native file videos */}
      {isFile && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-6 md:gap-10 z-20">
          <button
            onClick={togglePlay}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label={isPlaying ? "Pause" : "Lecture"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-white fill-white" />
            ) : (
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            )}
          </button>
          <button
            onClick={toggleMute}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label={isMuted ? "Activer le son" : "Couper le son"}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5 text-white" />
            ) : (
              <Volume2 className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      )}

      {/* Description card */}
      {(() => {
        const currentVideoDoc = videoDocs.find(d => d.url === vidUrl);
        const isExternalOwner = currentVideoDoc?.owner_business_id && currentVideoDoc.owner_business_id !== businessId;
        const hasContent = activeVideo.description || activeVideo.name;
        const showOwnerFallback = !activeVideo.name && isExternalOwner && currentVideoDoc?.owner_name;

        if (!hasContent && !showOwnerFallback) return null;

        return (
          <div className="absolute left-3 right-3 md:left-[15%] md:right-[15%] top-[7rem] lg:top-14 bottom-5 md:bottom-auto z-10 pointer-events-auto overflow-hidden flex flex-col">
            <div className="rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white max-h-full md:max-h-none overflow-y-auto md:overflow-y-visible">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  {activeVideo.name ? (
                    <h2 className="text-base md:text-xl font-bold drop-shadow-lg uppercase line-clamp-2 md:truncate" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', WebkitTextStroke: '0.8px currentColor', textShadow: '0 0 0 currentColor' }}>
                      {activeVideo.name}
                    </h2>
                  ) : showOwnerFallback ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base md:text-xl font-bold drop-shadow-lg uppercase" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', WebkitTextStroke: '0.8px currentColor', textShadow: '0 0 0 currentColor' }}>
                        {currentVideoDoc!.owner_name} <span className="text-lg">©</span>
                      </span>
                        {currentVideoDoc!.owner_instagram && (
                        <a
                          href={currentVideoDoc!.owner_instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ml-2 text-white/80 hover:text-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <InstagramIcon className="h-4 w-4 text-white/80" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <h2 className="text-base md:text-xl font-bold drop-shadow-lg uppercase line-clamp-2 md:truncate" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', WebkitTextStroke: '0.8px currentColor', textShadow: '0 0 0 currentColor' }}>
                      {businessName || 'Détails'}
                    </h2>
                  )}
                </div>
                {activeVideo.description && (
                  <button
                    onClick={() => setDescExpanded(p => !p)}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
                    aria-label={descExpanded ? "Replier" : "Déplier"}
                  >
                    {descExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {activeVideo.description && descExpanded && (
                <div
                  className="mt-3 text-sm leading-relaxed pr-1 prose prose-invert prose-sm max-w-none break-words [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white"
                  style={{ fontFamily: "'Roboto', sans-serif", letterSpacing: '0.02em' }}
                  dangerouslySetInnerHTML={{ __html: activeVideo.description }}
                />
              )}
            </div>
          </div>
        );
      })()}
    </div>
    </div>
  );
};

export default VideoDocumentOverlay;
