import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { loadYouTubeApi } from "@/lib/loadYouTubeApi";

interface Props {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  visible?: boolean;
  /** Optional override of the outer container classes. When omitted, the component floats absolutely at the bottom of its nearest relative ancestor. */
  className?: string;
}

function formatTime(totalSeconds: number) {
  if (!isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type YTPlayerLike = {
  getDuration(): number;
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy?(): void;
};

/**
 * Floating scrubbar overlay for the YouTube iframe embedded in the slide panel.
 * Uses the official YouTube IFrame API to read the current playback position
 * and seek, while keeping the native control chrome hidden (fs=0, controls=1).
 */
export function YoutubeScrubBar({ iframeRef, visible = true, className }: Props) {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const playerRef = useRef<YTPlayerLike | null>(null);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  // Wire up the YouTube player via the IFrame API and poll for progress.
  useEffect(() => {
    if (!visible) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let pollId: number | null = null;

    const startPolling = (player: YTPlayerLike) => {
      playerRef.current = player;
      if (pollId) window.clearInterval(pollId);
      pollId = window.setInterval(() => {
        if (!playerRef.current) return;
        try {
          const dur = playerRef.current.getDuration();
          const cur = playerRef.current.getCurrentTime();
          if (dur > 0) {
            setDuration((prev) => (Math.abs(prev - dur) > 0.5 ? dur : prev));
          }
          if (!draggingRef.current) {
            setCurrentTime(cur);
          }
        } catch {
          // player may be destroyed
        }
      }, 250);
    };

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        new YT.Player(iframe, {
          events: {
            onReady: (event) => {
              if (cancelled) return;
              startPolling(event.target as YTPlayerLike);
            },
          },
        });
      })
      .catch(() => {
        // Fallback: keep the native controls visible if the API fails to load.
      });

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [iframeRef, visible]);

  // Reset when hidden.
  useEffect(() => {
    if (!visible) {
      setDuration(0);
      setCurrentTime(0);
    }
  }, [visible]);

  const seekTo = (sec: number) => {
    try {
      playerRef.current?.seekTo?.(sec, true);
    } catch {
      // ignore
    }
  };

  const computeTime = (clientX: number) => {
    const el = barRef.current;
    if (!el || !duration) return 0;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return pct * duration;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!duration) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setDragValue(computeTime(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setDragValue(computeTime(e.clientX));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const sec = computeTime(e.clientX);
    seekTo(sec);
    setDragging(false);
    setCurrentTime(sec);
  };

  const progress = duration ? ((dragging ? dragValue : currentTime) / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-full bg-black/55 backdrop-blur-md border border-white/10 px-3 py-2 flex items-center gap-3 shadow-lg select-none",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        if (draggingRef.current) {
          seekTo(dragValue);
          setDragging(false);
          setCurrentTime(dragValue);
        }
      }}
    >
      <span className="text-[11px] font-medium text-white/90 tabular-nums min-w-[34px] text-center">
        {formatTime(dragging ? dragValue : currentTime)}
      </span>

      <div ref={barRef} className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer">
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-[#C04F17]"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 hover:opacity-100 transition-opacity"
          style={{ left: `${Math.max(0, Math.min(100, progress))}%`, opacity: dragging ? 1 : undefined }}
        />
      </div>

      <span className="text-[11px] font-medium text-white/60 tabular-nums min-w-[34px] text-center">
        {formatTime(duration)}
      </span>
    </div>
  );
}
