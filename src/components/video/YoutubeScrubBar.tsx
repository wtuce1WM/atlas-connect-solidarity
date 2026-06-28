import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  visible?: boolean;
  /** Optional override of the outer container classes. When omitted, the component floats absolutely at the bottom of its nearest relative ancestor. */
  className?: string;
}

/**
 * Floating scrubbar overlay for the YouTube iframe embedded in the slide panel.
 * Communicates via the YT IFrame API postMessage protocol (no SDK load required):
 *  - {event:"listening"} → triggers periodic infoDelivery messages with {currentTime, duration}
 *  - {event:"command", func:"seekTo", args:[seconds, true]} → seeks the player
 *
 * The native YouTube controls are hidden by `fs=0` / minimal chrome; this component
 * exposes only the timeline (scrub) without play/volume/fullscreen.
 */
export function YoutubeScrubBar({ iframeRef, visible = true, className }: Props) {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  useEffect(() => {
    if (!visible) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const sendHandshake = () => {
      const payload = JSON.stringify({ event: "listening", id: 0, channel: "widget" });
      try {
        iframe.contentWindow?.postMessage(payload, "*");
      } catch { /* ignore */ }
    };
    sendHandshake();
    const id = window.setInterval(sendHandshake, 2000);

    const onMsg = (e: MessageEvent) => {
      if (!e.origin.includes("youtube")) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const info = data?.info;
        if (info && typeof info === "object") {
          if (typeof info.duration === "number" && info.duration > 0) {
            setDuration((prev) => (Math.abs(prev - info.duration) > 0.5 ? info.duration : prev));
          }
          if (typeof info.currentTime === "number" && !draggingRef.current) {
            setCurrentTime(info.currentTime);
          }
        }
      } catch {
        /* ignore non-YT messages */
      }
    };
    window.addEventListener("message", onMsg);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("message", onMsg);
    };
  }, [iframeRef, visible]);

  // Reset when iframe changes (new video) — duration becomes stale.
  useEffect(() => {
    if (!visible) {
      setDuration(0);
      setCurrentTime(0);
    }
  }, [visible]);

  const seekTo = (sec: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "seekTo", args: [sec, true] }),
      "*",
    );
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
    const t = computeTime(e.clientX);
    setDragging(false);
    setCurrentTime(t);
    seekTo(t);
  };

  const value = dragging ? dragValue : currentTime;
  const pct = duration > 0 ? (value / duration) * 100 : 0;

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  if (!visible || duration <= 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto w-[min(680px,92%)] rounded-full bg-black/55 backdrop-blur-md px-4 py-2.5 flex items-center gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-white/10",
        !className && "absolute left-1/2 -translate-x-1/2 bottom-4 md:bottom-6 z-40",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <span className="text-white text-[11px] font-mono w-10 text-right tabular-nums select-none">
        {fmt(value)}
      </span>
      <div
        ref={barRef}
        className="relative flex-1 h-2 rounded-full bg-white/20 cursor-pointer touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#C04F17] pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="text-white/80 text-[11px] font-mono w-10 tabular-nums select-none">
        {fmt(duration)}
      </span>
    </div>
  );
}

export default YoutubeScrubBar;
