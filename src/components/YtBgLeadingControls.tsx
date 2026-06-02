import { useEffect, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

/**
 * Play/Pause + Mute controls for the background YouTube video rendered by
 * YouTubeChannelsTabContent. Communicates via window CustomEvents:
 *   - dispatch "ytbg:toggle-play" / "ytbg:toggle-mute" to control
 *   - listen to "ytbg:state" for { playing, muted } updates
 *   - dispatch "ytbg:request-state" on mount to sync initial state
 *
 * Matches the visual design of the 4 default round buttons in PanelSearchBar.
 */
const YtBgLeadingControls = () => {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent).detail as { playing: boolean; muted: boolean } | undefined;
      if (!detail) return;
      setPlaying(detail.playing);
      setMuted(detail.muted);
    };
    window.addEventListener("ytbg:state", onState);
    window.dispatchEvent(new Event("ytbg:request-state"));
    return () => window.removeEventListener("ytbg:state", onState);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("ytbg:toggle-play"))}
        aria-label={playing ? "Pause" : "Play"}
        className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
      >
        {playing ? <Pause className="h-5 w-5 md:h-6 md:w-6" /> : <Play className="h-5 w-5 md:h-6 md:w-6" />}
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("ytbg:toggle-mute"))}
        aria-label={muted ? "Unmute" : "Mute"}
        className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
      >
        {muted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
      </button>
    </>
  );
};

export default YtBgLeadingControls;
