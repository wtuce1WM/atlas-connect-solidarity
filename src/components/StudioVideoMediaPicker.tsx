import { useRef, useState } from "react";
import { Film, Image as ImageIcon, Play, Pause } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SceneMediaItem } from "@/components/StudioVideoScenarioPanel";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMediaDuration(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

/** Video tile rendered at its natural aspect ratio, half-size, with inline playback. */
function VideoTile({
  item,
  selected,
  badge,
  onSelect,
}: {
  item: SceneMediaItem;
  selected: boolean;
  badge?: number | null;
  onSelect: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ratio, setRatio] = useState<number>(16 / 9);
  const [duration, setDuration] = useState<number | null>(item.duration ?? null);
  const [playing, setPlaying] = useState(false);

  // Half of a 320px reference size, keeping the native ratio
  const BASE = 300;
  const width = ratio >= 1 ? BASE / 2 : (BASE / 2) * ratio;
  const height = ratio >= 1 ? BASE / 2 / ratio : BASE / 2;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative rounded-md overflow-hidden border-2 bg-black shrink-0",
        selected ? "border-primary" : "border-transparent hover:border-primary/40"
      )}
      style={{ width: Math.round(width), height: Math.round(height) }}
    >
      <video
        ref={videoRef}
        src={item.url}
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-contain"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
          if (Number.isFinite(v.duration)) setDuration(v.duration);
        }}
        onEnded={() => setPlaying(false)}
      />
      <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-bold uppercase flex items-center gap-1">
        <Film className="h-2.5 w-2.5" /> vidéo
      </span>
      {duration != null && (
        <span className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-bold tabular-nums">
          {formatMediaDuration(duration)}
        </span>
      )}
      <span
        onClick={togglePlay}
        role="button"
        aria-label={playing ? "Pause" : "Lecture"}
        className="absolute bottom-1 left-1 rounded-full bg-white/85 text-black w-7 h-7 flex items-center justify-center hover:bg-white transition"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </span>
      {selected && (
        <span className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold w-6 h-6 flex items-center justify-center">
          {badge ?? "✓"}
        </span>
      )}
    </button>
  );
}

function ImageTile({
  item,
  selected,
  badge,
  onSelect,
}: {
  item: SceneMediaItem;
  selected: boolean;
  badge?: number | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative aspect-[4/3] rounded-md overflow-hidden border-2 bg-neutral-100",
        selected ? "border-primary" : "border-transparent hover:border-primary/40"
      )}
    >
      <img src={item.url} alt={item.title || ""} className="w-full h-full object-cover" loading="lazy" />
      <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-bold uppercase flex items-center gap-1">
        <ImageIcon className="h-2.5 w-2.5" /> image
      </span>
      {item.title && (
        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate text-left">
          {item.title}
        </span>
      )}
      {selected && (
        <span className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold w-6 h-6 flex items-center justify-center">
          {badge ?? "✓"}
        </span>
      )}
    </button>
  );
}

/**
 * Shared media grid: images displayed large (4/3), videos in their native
 * aspect ratio at half size with inline playback and duration badge.
 */
export function MediaPickerGrid({
  available,
  isSelected,
  badgeFor,
  onSelect,
  showImages = true,
  showVideos = true,
}: {
  available: SceneMediaItem[];
  isSelected: (m: SceneMediaItem) => boolean;
  badgeFor?: (m: SceneMediaItem) => number | null;
  onSelect: (m: SceneMediaItem) => void;
  showImages?: boolean;
  showVideos?: boolean;
}) {
  const images = showImages ? available.filter((m) => m.kind === "image") : [];
  const videos = showVideos ? available.filter((m) => m.kind === "video") : [];

  if (images.length === 0 && videos.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun média disponible pour cet établissement.</p>;
  }

  return (
    <div className="space-y-5">
      {videos.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Vidéos · {videos.length}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {videos.map((m) => (
              <VideoTile
                key={m.url}
                item={m}
                selected={isSelected(m)}
                badge={badgeFor?.(m) ?? null}
                onSelect={() => onSelect(m)}
              />
            ))}
          </div>
        </div>
      )}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Images · {images.length}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((m) => (
              <ImageTile
                key={m.url}
                item={m}
                selected={isSelected(m)}
                badge={badgeFor?.(m) ?? null}
                onSelect={() => onSelect(m)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
