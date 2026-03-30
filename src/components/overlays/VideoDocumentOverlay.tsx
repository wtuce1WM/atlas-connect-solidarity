import { useState, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { getVideoEmbed } from "@/lib/videoEmbed";
import type { VideoDoc } from "@/hooks/useBookOnlineData";

interface VideoDocumentOverlayProps {
  activeVideo: { url: string; name: string | null; description: string | null };
  videoDocs: VideoDoc[];
  closing: boolean;
  onClose: () => void;
  onNavigate: (video: { url: string; name: string | null; description: string | null }) => void;
  onAnimationEnd: () => void;
}

const VideoDocumentOverlay = ({
  activeVideo,
  videoDocs,
  closing,
  onClose,
  onNavigate,
  onAnimationEnd,
}: VideoDocumentOverlayProps) => {
  const [descExpanded, setDescExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
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
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    } else {
      postCmd(isMuted ? "unMute" : "mute");
    }
    setIsMuted(m => !m);
  }, [isMuted, postCmd]);

  const vidUrl = activeVideo.url;
  const currentIdx = videoDocs.findIndex(v => v.url === vidUrl);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < videoDocs.length - 1;

  const goTo = (idx: number) => {
    const v = videoDocs[idx];
    if (v) {
      onNavigate({ url: v.url, name: v.name, description: v.description });
      setDescExpanded(true);
      setIsPlaying(true);
      setIsMuted(false);
    }
  };

  const overlayVid = getVideoEmbed(vidUrl, window.location.origin);
  const overlayEmbedUrl = overlayVid.type === "youtube"
    ? overlayVid.embedUrl.replace(/mute=\d/, "mute=0").replace(/loop=\d/, "loop=1").replace(/controls=\d/, "controls=0") + `&playlist=${vidUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/)?.[1] || ""}`
    : overlayVid.type === "vimeo"
      ? overlayVid.embedUrl.replace(/muted=\d/, "muted=0").replace(/loop=\d/, "loop=1")
      : overlayVid.type === "bunny"
        ? overlayVid.embedUrl.replace(/loop=false/, "loop=true")
        : overlayVid.embedUrl;
  const isVerticalHint = overlayVid.isVertical;
  const isFile = overlayVid.type === "file";

  return (
    <div
      className={`absolute inset-0 z-[70] bg-black overflow-hidden ${closing ? 'animate-slide-out-bottom' : 'animate-slide-in-left'}`}
      style={{ marginTop: "-3.25rem" }}
      onAnimationEnd={() => { if (closing) onAnimationEnd(); }}
    >
      {/* Top bar: close + mobile nav with counter */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-500/70 backdrop-blur-sm flex items-center justify-center hover:bg-gray-500/90 transition-colors shrink-0"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Mobile: nav + counter inline */}
        <div className="flex md:hidden items-center justify-center flex-1 gap-3">
          <button
            onClick={() => hasPrev && goTo(currentIdx - 1)}
            className={`w-8 h-8 rounded-full bg-gray-500/70 backdrop-blur-sm flex items-center justify-center transition-colors ${hasPrev ? 'hover:bg-gray-500/90' : 'opacity-30'}`}
            disabled={!hasPrev}
            aria-label="Vidéo précédente"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <span className="text-white text-sm font-medium tabular-nums">
            {currentIdx + 1} / {videoDocs.length}
          </span>
          <button
            onClick={() => hasNext && goTo(currentIdx + 1)}
            className={`w-8 h-8 rounded-full bg-gray-500/70 backdrop-blur-sm flex items-center justify-center transition-colors ${hasNext ? 'hover:bg-gray-500/90' : 'opacity-30'}`}
            disabled={!hasNext}
            aria-label="Vidéo suivante"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="w-9 shrink-0 md:hidden" />
      </div>

      {/* Desktop/Tablet: centered chevrons */}
      {hasPrev && (
        <button
          onClick={() => goTo(currentIdx - 1)}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gray-500/70 backdrop-blur-sm items-center justify-center hover:bg-gray-500/90 transition-colors"
          aria-label="Vidéo précédente"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => goTo(currentIdx + 1)}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gray-500/70 backdrop-blur-sm items-center justify-center hover:bg-gray-500/90 transition-colors"
          aria-label="Vidéo suivante"
        >
          <ChevronRight className="h-5 w-5 text-white" />
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
                <div className="absolute inset-x-0 bottom-0 h-12 bg-black z-10" />
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

      {/* Description card */}
      {(activeVideo.description || activeVideo.name) && (
        <div className="absolute left-3 right-3 md:left-[15%] md:right-[15%] top-20 md:top-14 bottom-5 md:bottom-auto z-10 pointer-events-auto overflow-hidden flex flex-col">
          <div className="rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white max-h-full md:max-h-none overflow-y-auto md:overflow-y-visible">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold drop-shadow-lg uppercase line-clamp-3 md:line-clamp-2" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em' }}>
                  {activeVideo.name || "Détails"}
                </h2>
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
      )}
    </div>
  );
};

export default VideoDocumentOverlay;
