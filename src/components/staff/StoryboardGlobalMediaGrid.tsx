import { useMemo, useRef, useState } from "react";
import { Crosshair, GripVertical, Maximize2, Target, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Média global d'un montage, avec son ordre (index) et ses bornes de lecture. */
export type GlobalMediaItem = {
  url: string;
  /** Point de départ en secondes (0 = début). */
  start?: number;
  /** Point de fin en secondes (0/absent = fin réelle du média). */
  end?: number;
};

export const isVideoMediaUrl = (u: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);

const fmt = (s: number) => {
  const r = Math.round(s);
  const m = Math.floor(r / 60);
  const sec = r % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
};

/** Hauteur commune des vignettes : le format réel est respecté via la largeur. */
const TILE_H = 460;

function Tile({
  item,
  index,
  total,
  format,
  onPatch,
  onRemove,
  onDragStart,
  onDragEnd,
  onDropOn,
  dragging,
}: {
  item: GlobalMediaItem;
  index: number;
  total: number;
  format?: "portrait" | "landscape";
  onPatch: (values: Partial<GlobalMediaItem>) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
  dragging: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isVideo = isVideoMediaUrl(item.url);
  const [ratio, setRatio] = useState(isVideo ? 9 / 16 : 4 / 3);
  const [duration, setDuration] = useState<number | null>(null);
  const [head, setHead] = useState(item.start ?? 0);

  const start = item.start ?? 0;
  const end = item.end ?? 0;
  const maxTime = duration != null ? Math.round(duration * 10) / 10 : 3600;
  const width = Math.round(TILE_H * ratio);

  const capture = (which: "start" | "end") => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.currentTime)) return;
    const n = Math.round(el.currentTime * 10) / 10;
    // On enregistre la valeur telle quelle (0 inclus pour un Start au début).
    onPatch(which === "start" ? { start: n } : { end: n });
  };


  const fullscreen = () => {
    const el = (isVideo ? videoRef.current : wrapRef.current) as any;
    if (el?.requestFullscreen) el.requestFullscreen();
    else if (el?.webkitEnterFullscreen) el.webkitEnterFullscreen();
  };

  const fluid = format === "landscape";
  const tileWidth = fluid ? "100%" : width;
  const tileHeight = TILE_H;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropOn();
      }}
      className={`space-y-1 min-w-0 ${dragging ? "opacity-60" : ""}`}
      style={{ width: tileWidth }}
    >
      <div
        ref={wrapRef}
        className="relative rounded-md overflow-hidden border-2 border-border bg-black"
        style={{ width: tileWidth, height: tileHeight }}
        title={item.url}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={item.url}
            controls
            preload="metadata"
            playsInline
            className="w-full h-full object-contain bg-black"
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              if (el.videoWidth && el.videoHeight) setRatio(el.videoWidth / el.videoHeight);
              if (Number.isFinite(el.duration)) setDuration(el.duration);
              if (start > 0) el.currentTime = start;
              setHead(start);
            }}
            onTimeUpdate={(e) => setHead(Math.round(e.currentTarget.currentTime * 10) / 10)}
            onSeeked={(e) => setHead(Math.round(e.currentTarget.currentTime * 10) / 10)}
          />
        ) : (
          <img
            src={item.url}
            alt=""
            loading="lazy"
            className="w-full h-full object-contain"
            onLoad={(e) => {
              const el = e.currentTarget;
              if (el.naturalWidth && el.naturalHeight) setRatio(el.naturalWidth / el.naturalHeight);
            }}
          />
        )}

        <span className="pointer-events-none absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {index + 1}
        </span>
        {isVideo && duration != null && (
          <span className="pointer-events-none absolute top-1 left-7 bg-black/70 text-white text-[9px] font-bold px-1 rounded tabular-nums">
            {fmt(duration)}
          </span>
        )}
        {isVideo && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="bg-[#D4AF37] text-black text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shadow">
              ⏱ {head.toFixed(1)}s
            </span>
            <span className="bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shadow">
              Start {start.toFixed(1)}s · End {end > 0 ? `${end.toFixed(1)}s` : duration != null ? fmt(duration) : "fin"}
            </span>
          </div>
        )}
        <span className="pointer-events-none absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
          {isVideo ? "vidéo" : "image"}
        </span>

        <button
          type="button"
          onClick={onRemove}
          title="Retirer du montage"
          aria-label="Retirer du montage"
          className="absolute top-1 right-16 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center border border-white/40 hover:bg-black/80"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={fullscreen}
          title="Plein écran"
          aria-label="Plein écran"
          className="absolute top-1 right-8 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center border border-white/40 hover:bg-black/80"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title={`Déplacer (${index + 1}/${total})`}
          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center border border-white/40 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3 w-3" />
        </span>
      </div>

      {isVideo && (
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-1">
            <Input
              type="text"
              inputMode="decimal"
              value={startText}
              placeholder="Start (s)"
              title="Point de départ en secondes (ex : 2.3)"
              className="h-8 text-xs"
              onChange={(e) => {
                setStartText(e.target.value);
                onPatch({ start: parseTime(e.target.value, maxTime) });
              }}
              onBlur={() => setStartText(item.start != null ? String(item.start) : "")}
            />
            <Input
              type="text"
              inputMode="decimal"
              value={endText}
              placeholder="End (s)"
              title="Point de fin en secondes (ex : 8.5)"
              className="h-8 text-xs"
              onChange={(e) => {
                setEndText(e.target.value);
                onPatch({ end: parseTime(e.target.value, maxTime) });
              }}
              onBlur={() => setEndText(item.end != null ? String(item.end) : "")}
            />
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => capture("start")}
              title="Utiliser la position actuelle comme Time Start"
              className="flex-1 h-8 rounded-md border border-border hover:bg-muted flex items-center justify-center"
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => capture("end")}
              title="Utiliser la position actuelle comme Time End"
              className="flex-1 h-8 rounded-md border border-border hover:bg-muted flex items-center justify-center"
            >
              <Target className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Grille des médias globaux d'un montage : miniatures au format réel et en
 * grand, contrôles de lecture, ordre par glisser-déposer et bornes de lecture
 * (Start/End) — même interface que /studio-video → Vidéos de l'établissement.
 */
const StoryboardGlobalMediaGrid = ({
  items,
  format,
  onChange,
}: {
  items: GlobalMediaItem[];
  format?: "portrait" | "landscape";
  onChange: (items: GlobalMediaItem[]) => void;
}) => {
  const [dragUrl, setDragUrl] = useState<string | null>(null);

  const counts = useMemo(() => {
    const videos = items.filter((m) => isVideoMediaUrl(m.url)).length;
    return { videos, images: items.length - videos };
  }, [items]);

  if (items.length === 0) return null;

  const move = (from: string, to: string) => {
    if (from === to) return;
    const arr = items.slice();
    const i = arr.findIndex((m) => m.url === from);
    const j = arr.findIndex((m) => m.url === to);
    if (i < 0 || j < 0) return;
    const [moved] = arr.splice(i, 1);
    arr.splice(j, 0, moved);
    onChange(arr);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <Label className="text-sm">
        Ordre des médias dans le montage
        <span className="block text-[11px] text-muted-foreground font-normal">
          Glissez / déposez les vignettes (poignée) pour changer l'ordre. Le <b>Start</b> et le <b>End</b> (secondes,
          précision 0,1 s) définissent le point de départ et de fin de la vidéo dans le montage. Tout est enregistré avec
          le montage.
        </span>
      </Label>
      <p className="text-[11px] text-muted-foreground">
        {counts.videos} vidéo{counts.videos > 1 ? "s" : ""} · {counts.images} image{counts.images > 1 ? "s" : ""}
      </p>
      <div className={`items-start gap-3 ${format === "landscape" ? "grid grid-cols-2" : "flex flex-wrap"}`}>
        {items.map((m, i) => (
          <Tile
            key={m.url}
            item={m}
            index={i}
            total={items.length}
            format={format}
            dragging={dragUrl === m.url}
            onDragStart={() => setDragUrl(m.url)}
            onDragEnd={() => setDragUrl(null)}
            onDropOn={() => {
              if (dragUrl) move(dragUrl, m.url);
              setDragUrl(null);
            }}
            onPatch={(values) =>
              onChange(items.map((x) => (x.url === m.url ? { ...x, ...values } : x)))
            }
            onRemove={() => onChange(items.filter((x) => x.url !== m.url))}
          />
        ))}
      </div>
    </div>
  );
};

export default StoryboardGlobalMediaGrid;
