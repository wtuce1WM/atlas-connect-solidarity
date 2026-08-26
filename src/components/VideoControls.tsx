import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { RefObject } from "react";

interface FileVideoControlsProps {
  type: "file";
  videoRef: RefObject<HTMLVideoElement>;
  paused: boolean;
  muted: boolean;
}

interface YouTubeVideoControlsProps {
  type: "youtube";
  iframeRef: RefObject<HTMLIFrameElement>;
  playing: boolean;
  muted: boolean;
  onPlayingChange: (playing: boolean) => void;
  onMutedChange: (muted: boolean) => void;
}

type VideoControlsProps = (FileVideoControlsProps | YouTubeVideoControlsProps) & {
  className?: string;
};

const btnClass =
  "shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors";
const iconClass = "h-5 w-5 md:h-6 md:w-6";

const VideoControls = (props: VideoControlsProps) => {
  if (props.type === "file") {
    const { videoRef, paused, muted } = props;
    return (
      <div className={`flex items-center gap-3 md:gap-10 ${props.className ?? ""}`}>
        <button
          type="button"
          onClick={() => {
            if (videoRef.current) {
              if (videoRef.current.paused) videoRef.current.play();
              else videoRef.current.pause();
            }
          }}
          className={btnClass}
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? <Play className={iconClass} /> : <Pause className={iconClass} />}
        </button>
        <button
          type="button"
          data-sound-toggle="true"
          onClick={() => {
            if (videoRef.current) {
              const nextMuted = !videoRef.current.muted;
              if (!nextMuted && videoRef.current.volume === 0) videoRef.current.volume = 1;
              videoRef.current.muted = nextMuted;
            }
          }}
          className={btnClass}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className={iconClass} /> : <Volume2 className={iconClass} />}
        </button>
      </div>
    );
  }

  // YouTube
  const { iframeRef, playing, muted, onPlayingChange, onMutedChange } = props;
  return (
    <div className={`flex items-center gap-3 md:gap-10 ${props.className ?? ""}`}>
      <button
        type="button"
        onClick={() => {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: playing ? "pauseVideo" : "playVideo" }),
              "*"
            );
            onPlayingChange(!playing);
          }
        }}
        className={btnClass}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className={iconClass} /> : <Play className={iconClass} />}
      </button>
      <button
        type="button"
        onClick={() => {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: muted ? "unMute" : "mute" }),
              "*"
            );
            onMutedChange(!muted);
          }
        }}
        className={btnClass}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className={iconClass} /> : <Volume2 className={iconClass} />}
      </button>
    </div>
  );
};

export default VideoControls;
