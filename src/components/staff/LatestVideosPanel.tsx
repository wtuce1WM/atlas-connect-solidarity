import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  FileText,
  GripVertical,
  Loader2,
  Share2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Job = {
  id: string;
  title: string | null;
  prompt: string;
  status: string;
  output_url: string | null;
  created_at: string;
  duration_sec: number;
  tone: string;
  business_id: string | null;
  scenario_json: any;
  template_props: any;
  gallery_sort_order: number | null;
};

const slugify = (s: string) =>
  (s || "video-1wm")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "video-1wm";

const formatDateTime = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function estimateVideoCost(durationSec: number) {
  const scenarioUsd = 0.00214;
  const renderUsd = 0.002 + durationSec * 0.0001;
  return { usd: (scenarioUsd + renderUsd).toFixed(4) };
}

const LatestVideosPanel = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_jobs")
      .select(
        "id, title, prompt, status, output_url, created_at, duration_sec, tone, business_id, scenario_json, template_props, gallery_sort_order",
      )
      .eq("status", "done")
      .not("output_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Chargement impossible : " + error.message);
      setLoading(false);
      return;
    }
    const rows = ((data as any[]) ?? []) as Job[];
    rows.sort((a, b) => {
      const ao = a.gallery_sort_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.gallery_sort_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setJobs(rows);

    const ids = Array.from(new Set(rows.map((r) => r.business_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: biz } = await supabase.from("businesses").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      ((biz as any[]) ?? []).forEach((b: any) => (map[b.id] = b.name));
      setBusinessNames(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = jobs.findIndex((j) => j.id === active.id);
    const newIndex = jobs.findIndex((j) => j.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(jobs, oldIndex, newIndex);
    setJobs(next);
    setSaving(true);
    const results = await Promise.all(
      next.map((j, i) =>
        supabase.from("video_jobs").update({ gallery_sort_order: i }).eq("id", j.id),
      ),
    );
    setSaving(false);
    if (results.some((r) => r.error)) toast.error("Enregistrement du classement partiel");
    else toast.success("Classement enregistré");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    if (toDelete.output_url) {
      const marker = "/studio-videos/";
      const idx = toDelete.output_url.indexOf(marker);
      if (idx !== -1) {
        const path = toDelete.output_url.slice(idx + marker.length).split("?")[0];
        await supabase.storage.from("studio-videos").remove([path]);
      }
    }
    const { error } = await supabase.from("video_jobs").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) {
      toast.error("Suppression impossible : " + error.message);
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== toDelete.id));
    setToDelete(null);
    toast.success("Vidéo supprimée");
  };

  const ids = useMemo(() => jobs.map((j) => j.id), [jobs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Dernières vidéos</h2>
          <p className="text-sm text-muted-foreground">
            50 dernières vidéos générées, de la plus récente à la plus ancienne. Glissez-déposez pour
            définir le classement.
          </p>
        </div>
        {saving && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Aucune vidéo générée pour l'instant.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((j, i) => (
                <SortableVideoCard
                  key={j.id}
                  job={j}
                  index={i}
                  businessName={j.business_id ? businessNames[j.business_id] : undefined}
                  onDelete={() => setToDelete(j)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-md bg-white text-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-neutral-900">Supprimer cette vidéo ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-700">
            {toDelete?.title || "Sans titre"}
            {toDelete?.business_id && businessNames[toDelete.business_id]
              ? ` — ${businessNames[toDelete.business_id]}`
              : ""}
            . Cette action est définitive (fichier vidéo inclus).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function SortableVideoCard({
  job,
  index,
  businessName,
  onDelete,
}: {
  job: Job;
  index: number;
  businessName?: string;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-white p-3 space-y-2 text-neutral-900 ${
        isDragging ? "opacity-70 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium">
          <span className="text-neutral-500 mr-1">{index + 1}.</span>
          {businessName || "Corporate"}
        </div>
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-700 p-1"
          aria-label="Déplacer"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1">
        <div className={`text-sm font-medium ${job.title ? "" : "italic text-neutral-600"}`}>
          {job.title || "Sans titre"}
        </div>
        <div className="text-[11px] text-neutral-600 break-all">
          Fichier : {fileNameFromUrl(job.output_url, job.title || businessName)}
        </div>
      </div>

      <VideoWithMeta
        src={job.output_url as string}
        createdAt={job.created_at}
        extra={
          <>
            <PromptDialog prompt={job.prompt} />
            <VideoParamsDialog job={job} />
          </>
        }
      />

      <div className="flex items-center gap-3">
        <DownloadButton
          url={job.output_url as string}
          fileName={fileNameFromUrl(job.output_url, job.title || businessName)}
        />

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 text-xs underline text-destructive ml-auto"
        >
          <Trash2 className="h-3 w-3" /> Supprimer
        </button>
      </div>
    </div>
  );
}

function DownloadButton({ url, fileName }: { url: string; fileName: string }) {
  const download = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(obj), 5000);
    } catch {
      window.open(url, "_blank");
    }
  };
  return (
    <button type="button" onClick={download} className="inline-flex items-center gap-1 text-xs underline">
      <Download className="h-3 w-3" /> Télécharger
    </button>
  );
}

function ShareVideoButton({ src }: { src: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = src.startsWith("http") ? src : `${window.location.origin}${src}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        /* annulé */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien de la vidéo copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };
  return (
    <button type="button" onClick={share} className="inline-flex items-center gap-1 text-xs underline">
      <Share2 className="h-3 w-3" /> {copied ? "Lien copié" : "Partager"}
    </button>
  );
}

function PromptDialog({ prompt }: { prompt: string }) {
  const [open, setOpen] = useState(false);
  if (!prompt) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs underline"
      >
        <FileText className="h-3 w-3" /> Prompt
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white text-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-neutral-900">Prompt utilisé</DialogTitle>
          </DialogHeader>
          <p className="text-sm whitespace-pre-line text-neutral-700">{prompt}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

const TRANSITION_LABELS: Record<string, string> = {
  crossfade: "Fondu enchaîné",
  fade_black: "Fondu au noir",
  cut: "Coupe franche",
  zoom: "Zoom",
  slide: "Glissement",
  kenburns: "Ken Burns",
  fast: "Enchaînement rapide",
  mix: "Mix",
};

function VideoParamsDialog({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const opts = (job.scenario_json?.studio_options ?? {}) as Record<string, any>;
  const props = (job.template_props ?? {}) as Record<string, any>;
  const lang: string = opts.lang ?? props.lang ?? "fr";
  const hasParams = Object.keys(opts).length > 0;
  const order: string[] = Array.isArray(opts.scene_order)
    ? opts.scene_order
    : Array.isArray(props.scene_order)
      ? props.scene_order
      : [];
  const durations: Record<string, number> = opts.scene_durations ?? {};
  const tr = opts.transitions ?? {};

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs underline"
      >
        <SlidersHorizontal className="h-3 w-3" /> Paramètres
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white text-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-neutral-900">Paramètres de la vidéo</DialogTitle>
          </DialogHeader>
          {!hasParams ? (
            <p className="text-sm text-neutral-500">
              Aucun paramètre mémorisé pour cette vidéo.
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <div>
                  <span className="text-neutral-500">Langue : </span>
                  <strong>{lang === "en" ? "English" : lang === "ar" ? "العربية" : "Français"}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Durée : </span>
                  <strong>{job.duration_sec}s</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Ton : </span>
                  <strong>{job.tone}</strong>
                </div>
              </div>
              {order.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-neutral-500 mb-1">
                    Scénario ({order.length} étapes)
                  </div>
                  <ol className="space-y-0.5 text-xs">
                    {order.map((k, i) => (
                      <li key={`${k}-${i}`} className="flex justify-between gap-3">
                        <span>
                          {i + 1}. {k}
                        </span>
                        {durations[k] != null && (
                          <span className="text-neutral-500">{durations[k]}s</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {(tr.video || tr.image) && (
                <div className="text-xs">
                  <span className="text-neutral-500">Transitions : </span>
                  vidéos <strong>{TRANSITION_LABELS[tr.video] ?? tr.video ?? "—"}</strong>
                  {" · "}images <strong>{TRANSITION_LABELS[tr.image] ?? tr.image ?? "—"}</strong>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function VideoWithMeta({
  src,
  createdAt,
  extra,
}: {
  src: string;
  createdAt?: string | null;
  extra?: React.ReactNode;
}) {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        const len = r.headers.get("content-length");
        if (!cancelled && len) setSize(parseInt(len, 10));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  const fmtSize = (b: number) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} Ko` : `${(b / (1024 * 1024)).toFixed(2)} Mo`;

  const cost = duration != null ? estimateVideoCost(duration) : null;
  const createdLabel = formatDateTime(createdAt);

  return (
    <div className="space-y-1">
      <video
        src={src}
        controls
        preload="metadata"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDim({ w: v.videoWidth, h: v.videoHeight });
          setDuration(v.duration);
        }}
        className="rounded-md aspect-[9/16] bg-black max-w-[200px] w-full mx-auto"
      />
      {createdLabel && <div className="text-[11px] text-neutral-600">Créée le {createdLabel}</div>}
      <div className="text-[11px] text-neutral-600">
        {dim ? `${dim.w}×${dim.h}` : "…"}
        {duration != null ? ` · ${duration.toFixed(1)}s` : ""}
        {size != null ? ` · ${fmtSize(size)}` : ""}
        {cost && ` · Coût estimé : ~${cost.usd} $`}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <ShareVideoButton src={src} />
        {extra}
      </div>
    </div>
  );
}

export default LatestVideosPanel;
