import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Film, Image as ImageIcon, Loader2, Play, Pause, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Sélecteur de médias unique pour le montage vidéo (Storyboard / Studio).
 *
 * Sources agrégées :
 *  - `fiche`      : images + vidéos internes publiées sur la fiche
 *  - `generic`    : vidéos de fiche portant le badge « Generic »
 *  - `library`    : bibliothèque staff-only (`video_media_library`)
 *                   → `business_id = null` = média global (B-roll, logos, plans)
 *                   → `business_id` rempli = média staff-only rattaché à une fiche
 *
 * Les médias `library` ne sont JAMAIS affichés côté public : ils vivent hors
 * `businesses.images` / `business_documents`.
 */

export type PickerMedia = {
  url: string;
  kind: "image" | "video";
  title?: string | null;
  thumbnail?: string | null;
  duration?: number | null;
  source: "fiche" | "generic" | "library" | "generic_video" | "other";
  scope?: "global" | "business";
  libraryId?: string;
  orientation?: "landscape" | "portrait" | "square" | null;
  /** Fiche d'origine (utile pour les médias cross-fiches : générique). */
  ownerName?: string | null;
  /** Le média est aussi publié sur la fiche courante. */
  onFiche?: boolean;
};

type TypeFilter = "all" | "image" | "video";
type SourceFilter =
  | "all"
  | "fiche"
  | "generic"
  | "generic_video"
  | "landscape"
  | "other"
  | "library_business"
  | "library_global";

const documentVideoUrl = (d: any): string | null => {
  const url = d?.youtube_video_url || d?.instagram_video_url || d?.tiktok_video_url || d?.url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
};

const ratioToOrientation = (w: number, h: number): "landscape" | "portrait" | "square" =>
  w > h * 1.05 ? "landscape" : h > w * 1.05 ? "portrait" : "square";

const isInternalVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);

const detectOrientation = (m: PickerMedia): Promise<"landscape" | "portrait" | "square" | null> => {
  return new Promise((resolve) => {
    // Pas de crossOrigin : certains buckets/CDN ne renvoient pas d'en-tête CORS
    // et l'élément échouerait alors que les dimensions sont lisibles sans lui.
    const timeout = window.setTimeout(() => resolve(null), 8000);
    if (m.kind === "image") {
      const img = new Image();
      img.onload = () => {
        window.clearTimeout(timeout);
        resolve(ratioToOrientation(img.naturalWidth, img.naturalHeight));
      };
      img.onerror = () => {
        window.clearTimeout(timeout);
        resolve(null);
      };
      img.src = m.url;
    } else if (isInternalVideoUrl(m.url)) {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        window.clearTimeout(timeout);
        if (v.videoWidth && v.videoHeight) {
          resolve(ratioToOrientation(v.videoWidth, v.videoHeight));
        } else {
          resolve(null);
        }
      };
      v.onerror = () => {
        window.clearTimeout(timeout);
        resolve(null);
      };
      v.src = m.url;
    } else {
      window.clearTimeout(timeout);
      resolve(null);
    }
  });
};


const fmtDur = (s?: number | null) => {
  if (s == null || !Number.isFinite(s)) return null;
  const t = Math.round(s);
  const m = Math.floor(t / 60);
  const r = t % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
};

const SOURCE_LABEL: Record<PickerMedia["source"] | "library_global" | "library_business", string> = {
  fiche: "Fiche",
  generic: "Badge Générique",
  generic_video: "Vidéo générique",
  other: "Autre fiche",
  library: "Bibliothèque",
  library_global: "Bibliothèque globale",
  library_business: "Bibliothèque fiche",
};

/* ------------------------------------------------------------------ tiles */

function Tile({
  item,
  selected,
  badge,
  expectedOrientation,
  onSelect,
  onDelete,
  onOrientation,
}: {
  item: PickerMedia;
  selected: boolean;
  badge?: number | null;
  expectedOrientation?: "landscape" | "portrait";
  onSelect: () => void;
  onDelete?: () => void;
  onOrientation?: (o: "landscape" | "portrait" | "square") => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait" | "square" | null>(
    item.orientation ?? null,
  );
  const [duration, setDuration] = useState<number | null>(item.duration ?? null);

  const noteOrientation = (o: "landscape" | "portrait" | "square") => {
    setOrientation(o);
    onOrientation?.(o);
  };

  const mismatch =
    !!expectedOrientation && !!orientation && orientation !== "square" && orientation !== expectedOrientation;

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
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={`relative w-full aspect-[4/3] rounded-md overflow-hidden border-2 bg-black/90 ${
          selected ? "border-primary" : "border-transparent hover:border-primary/40"
        }`}
      >
        {item.kind === "video" ? (
          isInternalVideoUrl(item.url) ? (
            <video
              ref={videoRef}
              src={item.url}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) noteOrientation(ratioToOrientation(v.videoWidth, v.videoHeight));
                if (Number.isFinite(v.duration)) setDuration(v.duration);
              }}
              onEnded={() => setPlaying(false)}
            />
          ) : (
            <img
              src={item.thumbnail || ""}
              alt={item.title || "Vidéo"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )
        ) : (
          <img
            src={item.url}
            alt={item.title || ""}
            className="w-full h-full object-cover"
            loading="lazy"
            onLoad={(e) => {
              const i = e.currentTarget;
              if (i.naturalWidth && i.naturalHeight) noteOrientation(ratioToOrientation(i.naturalWidth, i.naturalHeight));
            }}
          />
        )}

        <span className="absolute top-1 left-1 flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-bold uppercase">
          {item.kind === "video" ? <Film className="h-2.5 w-2.5" /> : <ImageIcon className="h-2.5 w-2.5" />}
          {item.kind}
        </span>

        <span className="absolute bottom-1 left-1 flex items-center gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white uppercase font-bold">
            {item.source === "library"
              ? item.scope === "global"
                ? "globale"
                : "fiche · staff"
              : SOURCE_LABEL[item.source]}
          </span>
          {orientation && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                mismatch ? "bg-amber-500 text-black" : "bg-black/70 text-white"
              }`}
            >
              {orientation === "landscape" ? "16:9" : orientation === "portrait" ? "9:16" : "1:1"}
            </span>
          )}
        </span>

        {item.kind === "video" && isInternalVideoUrl(item.url) && (
          <span
            onClick={togglePlay}
            role="button"
            aria-label={playing ? "Pause" : "Lecture"}
            className="absolute bottom-1 right-1 rounded-full bg-white/85 text-black w-7 h-7 flex items-center justify-center hover:bg-white transition"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </span>
        )}

        {item.kind === "video" && fmtDur(duration) && (
          <span className="absolute top-1 right-8 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-bold tabular-nums">
            {fmtDur(duration)}
          </span>
        )}

        {selected && (
          <span className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold w-6 h-6 flex items-center justify-center">
            {badge ?? "✓"}
          </span>
        )}
      </button>

      {item.title && (
        <p className="mt-1 text-[10px] text-muted-foreground truncate" title={item.title}>
          {item.title}
        </p>
      )}

      {onDelete && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-background border text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Supprimer de la bibliothèque"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- data hooks */

export function useVideoMediaSources(businessId: string | null, open: boolean, otherSlug?: string) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PickerMedia[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const out: PickerMedia[] = [];

      // 1) Bibliothèque staff-only : global + (éventuellement) la fiche courante
      const libQuery = supabase
        .from("video_media_library")
        .select("id, business_id, kind, url, title, orientation, duration_sec")
        .order("created_at", { ascending: false })
        .limit(600);
      const { data: lib, error: libErr } = businessId
        ? await libQuery.or(`business_id.is.null,business_id.eq.${businessId}`)
        : await libQuery.is("business_id", null);
      if (libErr) throw libErr;
      for (const r of (lib ?? []) as any[]) {
        out.push({
          url: r.url,
          kind: r.kind,
          title: r.title,
          duration: r.duration_sec != null ? Number(r.duration_sec) : null,
          orientation: r.orientation ?? null,
          source: "library",
          scope: r.business_id ? "business" : "global",
          libraryId: r.id,
        });
      }

      // 2) Badge transverse « Generic » — toutes fiches confondues
      const { data: genericBadgeRows } = await supabase
        .from("badges")
        .select("id, name_fr")
        .ilike("name_fr", "generic");
      const genericBadgeId = (genericBadgeRows ?? []).find((b: any) => /^generic$/i.test(b.name_fr))?.id;
      let genericDocIds: string[] = [];
      if (genericBadgeId) {
        const { data: genericLinks } = await supabase
          .from("business_document_badges")
          .select("document_id")
          .eq("badge_id", genericBadgeId)
          .limit(1000);
        genericDocIds = (genericLinks ?? []).map((l: any) => String(l.document_id));
      }

      if (genericDocIds.length) {
        const genericSet = new Set(genericDocIds);
        const badgedDocs: any[] = [];
        for (let i = 0; i < genericDocIds.length; i += 200) {
          const { data, error } = await supabase
            .from("business_documents")
            .select("id, url, name, thumbnail_url, business_id, youtube_video_url, instagram_video_url, tiktok_video_url")
            .eq("type", "video")
            .in("id", genericDocIds.slice(i, i + 200));
          if (error) throw error;
          if (data) badgedDocs.push(...data);
        }

        const ownerIds = [...new Set(badgedDocs.map((d) => d.business_id).filter(Boolean))];
        const ownerNames = new Map<string, string>();
        for (let i = 0; i < ownerIds.length; i += 200) {
          const { data: owners } = await supabase
            .from("businesses")
            .select("id, name")
            .in("id", ownerIds.slice(i, i + 200));
          for (const owner of owners ?? []) ownerNames.set(String(owner.id), owner.name);
        }
        for (const d of badgedDocs) {
          const mediaUrl = documentVideoUrl(d);
          if (!mediaUrl) continue;
          out.push({
            url: mediaUrl,
            kind: "video",
            title: d.name ?? "Vidéo",
            thumbnail: d.thumbnail_url ?? null,
            source: genericSet.has(String(d.id)) ? "generic" : "fiche",
            ownerName: ownerNames.get(String(d.business_id)) ?? null,
          });
        }
      }

      const ficheUrls = new Set<string>();
      if (businessId) {
        // 3) Médias publics de la fiche courante
        const [{ data: biz }, { data: docs }] = await Promise.all([
          supabase.from("businesses").select("images, logo_url").eq("id", businessId).maybeSingle(),
          supabase
            .from("business_documents")
            .select("id, url, name, thumbnail_url, type, youtube_video_url, instagram_video_url, tiktok_video_url")
            .eq("business_id", businessId)
            .eq("type", "video"),
        ]);

        for (const url of ((biz as any)?.images ?? []) as string[]) {
          if (typeof url === "string" && url.trim()) {
            ficheUrls.add(url.trim().toLowerCase());
            out.push({ url, kind: "image", source: "fiche" });
          }
        }
        for (const d of (docs ?? []) as any[]) {
          const mediaUrl = documentVideoUrl(d);
          if (!mediaUrl) continue;
          ficheUrls.add(mediaUrl.toLowerCase());
          out.push({
            url: mediaUrl,
            kind: "video",
            title: d.name ?? "Vidéo",
            thumbnail: d.thumbnail_url ?? null,
            source: "fiche",
          });
        }
      }

      // 4) Vraies vidéos génériques (table `generic_videos`), distinctes du badge « Generic »
      const { data: gen } = await supabase
        .from("generic_videos" as any)
        .select("id, url, name, thumbnail_url, instagram_account, tiktok_account, youtube_account")
        .order("sort_order", { ascending: true })
        .limit(500);
      for (const g of (gen ?? []) as any[]) {
        const url = typeof g.url === "string" ? g.url.trim() : "";
        if (!url) continue;
        out.push({
          url,
          kind: "video",
          title: g.name ?? "Vidéo générique",
          thumbnail: g.thumbnail_url ?? null,
          source: "generic_video",
          ownerName: g.instagram_account || g.tiktok_account || g.youtube_account || null,
        });
      }

      // 5) Bibliothèque globale : médias publics d'une autre fiche, par slug
      const slug = (otherSlug ?? "").trim();
      if (slug.length >= 2) {
        const { data: others } = await supabase
          .from("businesses")
          .select("id, name, slug")
          .or(`slug.ilike.%${slug}%,name.ilike.%${slug}%`)
          .limit(5);
        for (const o of (others ?? []) as any[]) {
          const [{ data: ob }, { data: odocs }] = await Promise.all([
            supabase.from("businesses").select("images").eq("id", o.id).maybeSingle(),
            supabase
              .from("business_documents")
              .select("id, url, name, thumbnail_url, youtube_video_url, instagram_video_url, tiktok_video_url")
              .eq("business_id", o.id)
              .eq("type", "video"),
          ]);
          for (const url of ((ob as any)?.images ?? []) as string[]) {
            if (typeof url === "string" && url.trim())
              out.push({ url: url.trim(), kind: "image", source: "other", ownerName: o.name });
          }
          for (const d of (odocs ?? []) as any[]) {
            const mediaUrl = documentVideoUrl(d);
            if (!mediaUrl) continue;
            out.push({
              url: mediaUrl,
              kind: "video",
              title: d.name ?? "Vidéo",
              thumbnail: d.thumbnail_url ?? null,
              source: "other",
              ownerName: o.name,
            });
          }
        }
      }

      // Déduplication par URL, la bibliothèque staff prime (elle porte les métadonnées)
      const seen = new Set<string>();
      const deduped = out
        // Les vidéos externes (YouTube / TikTok / Instagram) ne sont pas des fichiers
        // téléchargeables : le moteur de rendu ne peut pas les monter → jamais affichées.
        .filter((m) => (m.kind === "video" ? isInternalVideoUrl(m.url) : true))
        .filter((m) => {
          const k = m.url.trim().toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        // un média badgé qui appartient aussi à la fiche courante reste visible dans « Fiche »
        .map((m) => ({ ...m, onFiche: ficheUrls.has(m.url.trim().toLowerCase()) }));

      // Détection réelle des orientations (images + vidéos internes) pour le filtre 16:9.
      // Important : en parallèle total (des centaines de requêtes simultanées) le
      // navigateur sature et la plupart des détections expiraient → orientation null,
      // donc quasi rien dans le filtre 16:9. On détecte donc par lots concurrents
      // limités, en mettant à jour la liste au fur et à mesure.
      setItems(deduped);
      const CONCURRENCY = 6;
      let cursor = 0;
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (cursor < deduped.length) {
          const idx = cursor++;
          const m = deduped[idx];
          if (m.orientation) continue;
          const o = await detectOrientation(m);
          if (!o) continue;
          setItems((prev) => prev.map((it) => (it.url === m.url ? { ...it, orientation: o } : it)));
        }
      });
      void Promise.all(workers);
    } catch (e: any) {
      toast.error(`Chargement des médias impossible : ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }, [businessId, otherSlug]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return { items, loading, reload: load, setItems };
}

/**
 * Toutes les vidéos internes du site (toutes fiches confondues) + vidéos génériques.
 * Utilisé par l'entrée « Vidéos 16:9 » : aucune condition de fiche, de badge ou de
 * bibliothèque. L'orientation n'existe pas en base : elle est mesurée côté client
 * (métadonnées du fichier) par lots concurrents, avec remontée progressive.
 */
export function useAllInternalVideos(enabled: boolean, batch = 400) {
  const [items, setItems] = useState<PickerMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || loadedRef.current) return;
    loadedRef.current = true;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [{ data: docs }, { data: gen }] = await Promise.all([
          supabase
            .from("business_documents")
            .select("id, url, name, thumbnail_url, business_id")
            .eq("type", "video")
            .not("url", "is", null)
            .order("created_at", { ascending: false })
            .limit(batch),
          supabase
            .from("generic_videos" as any)
            .select("id, url, name, thumbnail_url")
            .order("sort_order", { ascending: true })
            .limit(500),
        ]);

        const out: PickerMedia[] = [];
        const ownerIds = [...new Set((docs ?? []).map((d: any) => d.business_id).filter(Boolean))];
        const ownerNames = new Map<string, string>();
        for (let i = 0; i < ownerIds.length; i += 200) {
          const { data: owners } = await supabase
            .from("businesses")
            .select("id, name")
            .in("id", ownerIds.slice(i, i + 200) as string[]);
          for (const o of owners ?? []) ownerNames.set(String(o.id), o.name);
        }
        for (const d of (docs ?? []) as any[]) {
          const url = typeof d.url === "string" ? d.url.trim() : "";
          if (!url || !isInternalVideoUrl(url)) continue;
          out.push({
            url,
            kind: "video",
            title: d.name ?? "Vidéo",
            thumbnail: d.thumbnail_url ?? null,
            source: "other",
            ownerName: ownerNames.get(String(d.business_id)) ?? null,
          });
        }
        for (const g of (gen ?? []) as any[]) {
          const url = typeof g.url === "string" ? g.url.trim() : "";
          if (!url || !isInternalVideoUrl(url)) continue;
          out.push({
            url,
            kind: "video",
            title: g.name ?? "Vidéo générique",
            thumbnail: g.thumbnail_url ?? null,
            source: "generic_video",
          });
        }

        const seen = new Set<string>();
        const deduped = out.filter((m) => {
          const k = m.url.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        if (!alive) return;
        setItems(deduped);
        setLoading(false);

        const CONCURRENCY = 8;
        let cursor = 0;
        const workers = Array.from({ length: CONCURRENCY }, async () => {
          while (cursor < deduped.length && alive) {
            const m = deduped[cursor++];
            const o = await detectOrientation(m);
            if (!alive) return;
            setScanned((n) => n + 1);
            if (!o) continue;
            setItems((prev) => prev.map((it) => (it.url === m.url ? { ...it, orientation: o } : it)));
          }
        });
        void Promise.all(workers);
      } catch (e: any) {
        setLoading(false);
        toast.error(`Vidéos 16:9 : ${e.message ?? e}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, batch]);

  return { items, loading, scanned };
}

/* ------------------------------------------------------------------ modal */

export function VideoMediaPickerDialog({
  businessId,
  value,
  onChange,
  allow = "all",
  multiple = false,
  max = 4,
  format,
  label = "Choisir un média",
  triggerClassName,
}: {
  businessId: string | null;
  /** URLs sélectionnées (ordre conservé). */
  value: string[];
  onChange: (urls: string[]) => void;
  allow?: TypeFilter;
  multiple?: boolean;
  max?: number;
  /** Format du montage — sert à signaler les médias mal orientés. */
  format?: "portrait" | "landscape";
  label?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [slugQuery, setSlugQuery] = useState("");
  const [otherSlug, setOtherSlug] = useState("");
  const [slugOptions, setSlugOptions] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const { items, loading, reload, setItems } = useVideoMediaSources(businessId, open, otherSlug);
  const [wideAsked, setWideAsked] = useState(false);
  const {
    items: wideVideos,
    loading: wideLoading,
    scanned: wideScanned,
  } = useAllInternalVideos(open && wideAsked);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(allow === "all" ? "all" : allow);
  // Par défaut on ouvre sur les médias de la fiche (« Fiche · vidéos » quand la
  // scène n'accepte que des vidéos) : c'est le cas d'usage courant.
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("fiche");
  const [search, setSearch] = useState("");
  const [uploadScope, setUploadScope] = useState<"global" | "business">(businessId ? "business" : "global");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (allow !== "all") setTypeFilter(allow);
  }, [allow]);

  useEffect(() => {
    if (open) setSourceFilter("fiche");
  }, [open]);

  // Auto-complete sur les autres fiches (nom ou slug) — aucun bouton à cliquer.
  useEffect(() => {
    const q = slugQuery.trim();
    if (q.length < 2) {
      setSlugOptions([]);
      setOtherSlug("");
      return;
    }
    let alive = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug")
        .or(`slug.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(8);
      if (!alive) return;
      setSlugOptions((data ?? []) as any[]);
      setOtherSlug(q);
      setSourceFilter("other");
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [slugQuery]);


  /** Base restreinte par `allow` + type : sert aussi aux compteurs du menu déroulant. */
  const typeBase = useMemo(
    () =>
      items.filter((m) => {
        if (allow !== "all" && m.kind !== allow) return false;
        if (typeFilter !== "all" && m.kind !== typeFilter) return false;
        return true;
      }),
    [items, allow, typeFilter],
  );

  const matchSource = (m: PickerMedia, f: SourceFilter) => {
    switch (f) {
      case "all":
        return true;
      case "fiche":
        return m.source === "fiche" || !!m.onFiche;
      case "generic":
        return m.source === "generic";
      case "generic_video":
        return m.source === "generic_video";
      case "landscape":
        // Vidéos uniquement (jamais d'images), toutes fiches + génériques confondues.
        return m.kind === "video" && m.orientation === "landscape";
      case "other":
        return m.source === "other";
      case "library_business":
        return m.source === "library" && m.scope === "business";
      case "library_global":
        return m.source === "library" && m.scope === "global";
    }
  };

  useEffect(() => {
    if (sourceFilter === "landscape") setWideAsked(true);
  }, [sourceFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = sourceFilter === "landscape" ? wideVideos : typeBase;
    return base.filter((m) => {
      if (!matchSource(m, sourceFilter)) return false;
      if (
        q &&
        !(m.title ?? "").toLowerCase().includes(q) &&
        !(m.ownerName ?? "").toLowerCase().includes(q) &&
        !m.url.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [typeBase, wideVideos, sourceFilter, search]);

  const PAGE_SIZE = 30;
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [sourceFilter, typeFilter, search, otherSlug, open]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filtered, page],
  );

  const toggle = (m: PickerMedia) => {
    if (!multiple) {
      onChange([m.url]);
      setOpen(false);
      return;
    }
    if (value.includes(m.url)) onChange(value.filter((u) => u !== m.url));
    else if (value.length < max) onChange([...value, m.url]);
    else toast.info(`${max} médias maximum pour cette section.`);
  };

  /** Orientation détectée par une vignette → remontée dans la liste pour que
   *  les compteurs (« Format paysage 16:9 ») restent cohérents avec les badges. */
  const noteOrientation = (m: PickerMedia, o: "landscape" | "portrait" | "square") => {
    setItems((prev) =>
      prev.map((it) => (it.url === m.url && it.orientation !== o ? { ...it, orientation: o } : it)),
    );
  };

  // Toggle « tous / aucun » réservé à l'entrée Fiche · vidéos.
  const effectiveType = allow !== "all" ? allow : typeFilter;
  const showFicheVideosToggle = multiple && sourceFilter === "fiche" && effectiveType === "video";
  const ficheVideoUrls = useMemo(
    () => (showFicheVideosToggle ? filtered.map((m) => m.url) : []),
    [showFicheVideosToggle, filtered],
  );
  const allFicheVideosSelected =
    ficheVideoUrls.length > 0 && ficheVideoUrls.every((u) => value.includes(u));
  const toggleAllFicheVideos = () => {
    if (allFicheVideosSelected) {
      onChange(value.filter((u) => !ficheVideoUrls.includes(u)));
      return;
    }
    const merged = [...value];
    for (const u of ficheVideoUrls) if (!merged.includes(u) && merged.length < max) merged.push(u);
    if (merged.length === value.length) toast.info(`${max} médias maximum pour cette section.`);
    onChange(merged);
  };



  const uploadOne = async (file: File) => {
    const kind: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
    const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "video" ? "mp4" : "jpg");
    const path = `${uploadScope === "business" && businessId ? businessId : "global"}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("video-assets").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("video-assets").getPublicUrl(path);
    const { data: me } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from("video_media_library").insert({
      business_id: uploadScope === "business" ? businessId : null,
      kind,
      url: pub.publicUrl,
      title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
      storage_path: path,
      created_by: me.user?.id ?? null,
    });
    if (insErr) throw insErr;
  };

  const uploadFiles = async (files: File[]) => {
    const usable = files.filter((f) => f.type.startsWith("image") || f.type.startsWith("video"));
    if (usable.length === 0) {
      toast.error("Seules les images et vidéos sont acceptées.");
      return;
    }
    setUploading(true);
    let ok = 0;
    try {
      for (const f of usable) {
        try {
          await uploadOne(f);
          ok += 1;
        } catch (e: any) {
          toast.error(`${f.name} : ${e.message ?? e}`);
        }
      }
      if (ok > 0) toast.success(`${ok} média${ok > 1 ? "s" : ""} ajouté${ok > 1 ? "s" : ""} à la bibliothèque staff`);
      await reload();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeFromLibrary = async (m: PickerMedia) => {
    if (!m.libraryId) return;
    const { error } = await supabase.from("video_media_library").delete().eq("id", m.libraryId);
    if (error) {
      toast.error(`Suppression impossible : ${error.message}`);
      return;
    }
    onChange(value.filter((u) => u !== m.url));
    toast.success("Média retiré de la bibliothèque");
    await reload();
  };

  const setOrientationOnce = async (m: PickerMedia, o: "landscape" | "portrait" | "square") => {
    if (!m.libraryId || m.orientation) return;
    await supabase.from("video_media_library").update({ orientation: o }).eq("id", m.libraryId);
  };

  // Compteurs alignés sur les filtres réellement appliqués (type + allow)
  const counts = useMemo(
    () => ({
      all: typeBase.length,
      fiche: typeBase.filter((m) => matchSource(m, "fiche")).length,
      generic: typeBase.filter((m) => m.source === "generic").length,
      genericVideo: typeBase.filter((m) => m.source === "generic_video").length,
      landscape: wideVideos.filter((m) => m.orientation === "landscape").length,
      other: typeBase.filter((m) => m.source === "other").length,
      libBiz: typeBase.filter((m) => m.source === "library" && m.scope === "business").length,
      libGlobal: typeBase.filter((m) => m.source === "library" && m.scope === "global").length,
    }),
    [typeBase],
  );

  const selectedItems = value
    .map((u) => items.find((m) => m.url === u) ?? ({ url: u, kind: "image", source: "fiche" } as PickerMedia))
    .filter(Boolean);

  const activeTypeLabel =
    allow === "image" || typeFilter === "image"
      ? "images"
      : allow === "video" || typeFilter === "video"
        ? "vidéos"
        : "médias";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline" className={`h-7 gap-1 text-[11px] ${triggerClassName ?? ""}`}>
              <ImageIcon className="h-3 w-3" /> {label}
            </Button>
          </DialogTrigger>
          <DialogContent
            className={`max-w-5xl max-h-[85vh] overflow-y-auto ${dragOver ? "ring-2 ring-primary" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const files = Array.from(e.dataTransfer.files ?? []);
              if (files.length) void uploadFiles(files);
            }}
          >
            <DialogHeader>
              <DialogTitle>Médias du montage</DialogTitle>
              <DialogDescription className="text-xs">
                Fiche · Générique · Bibliothèque staff (globale ou rattachée). Le filtre « Format paysage 16:9 » sélectionne
                les médias dont les dimensions réelles sont au format paysage. Les médias importés ici sont réservés au
                staff et ne sont jamais publiés sur le site. Les vidéos externes (YouTube / TikTok / Instagram) ne sont pas
                listées : elles ne sont pas montables au rendu. Affichage paginé par 30.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2 border-b pb-3">
              {allow === "all" && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="all">Images + vidéos</option>
                  <option value="image">Images seulement</option>
                  <option value="video">Vidéos seulement</option>
                </select>
              )}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="all">Toutes les sources ({counts.all})</option>
                <option value="fiche">Fiche · {activeTypeLabel} ({counts.fiche})</option>
                <option value="generic_video">Vidéos génériques ({counts.genericVideo})</option>
                <option value="generic">Badge Générique ({counts.generic})</option>
                <option value="landscape">Vidéos 16:9 · toutes fiches + génériques ({counts.landscape})</option>
                <option value="other">Autre fiche par slug · {activeTypeLabel} ({counts.other})</option>
                <option value="library_business">Bibliothèque fiche · {activeTypeLabel} ({counts.libBiz})</option>
                <option value="library_global">Bibliothèque globale · {activeTypeLabel} ({counts.libGlobal})</option>
              </select>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (titre, fiche, URL)…"
                className="h-8 w-44 text-xs"
              />
              {showFicheVideosToggle && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={toggleAllFicheVideos}
                  disabled={ficheVideoUrls.length === 0}
                >
                  {allFicheVideosSelected ? "Tout désélectionner" : `Tout sélectionner (${ficheVideoUrls.length})`}
                </Button>
              )}
              <div className="relative">
                <Input
                  value={slugQuery}
                  onChange={(e) => setSlugQuery(e.target.value)}
                  placeholder="slug d'une autre fiche…"
                  className="h-8 w-44 text-xs"
                />
                {slugOptions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-64 max-h-56 overflow-y-auto rounded-md border bg-popover shadow-md">
                    {slugOptions.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className="block w-full px-2 py-1.5 text-left text-xs hover:bg-accent"
                        onClick={() => {
                          setSlugQuery(o.slug || o.name);
                          setSlugOptions([]);
                          setOtherSlug(o.slug || o.name);
                          setSourceFilter("other");
                        }}
                      >
                        <span className="font-medium">{o.name}</span>
                        {o.slug && <span className="text-muted-foreground"> · {o.slug}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <select
                  value={uploadScope}
                  onChange={(e) => setUploadScope(e.target.value as "global" | "business")}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                  disabled={!businessId}
                >
                  <option value="global">Ajouter en global</option>
                  {businessId && <option value="business">Ajouter à cette fiche</option>}
                </select>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) void uploadFiles(files);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1 text-xs"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Importer
                </Button>
              </div>
            </div>

            <div
              className={`rounded-md border border-dashed px-3 py-2 text-[11px] ${
                dragOver ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"
              }`}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Envoi en cours…
                </span>
              ) : (
                <>
                  Glissez-déposez ici vos images / vidéos — elles rejoignent la bibliothèque{" "}
                  <b>{uploadScope === "business" ? "de cette fiche" : "globale"}</b> (staff uniquement).
                </>
              )}
            </div>

            {format && (
              <p className="text-[11px] text-muted-foreground">
                Montage {format === "portrait" ? "portrait 9:16" : "paysage 16:9"} — les médias signalés en orange sont
                dans l'autre orientation (recadrage automatique au rendu).
              </p>
            )}

            <p className="text-[11px] text-muted-foreground">
              Les compteurs affichent uniquement les {activeTypeLabel} compatibles avec cette scène. « Autre fiche » se
              charge automatiquement dès la saisie d’un nom ou slug.
            </p>

            {sourceFilter === "landscape" && (
              <p className="text-[11px] text-muted-foreground">
                Vidéos internes des {wideVideos.length} fichiers les plus récents (toutes fiches) + génériques.
                L'orientation n'est pas stockée en base : elle est mesurée fichier par fichier
                ({wideScanned}/{wideVideos.length} analysés) — la liste se remplit au fur et à mesure.
              </p>
            )}

            {loading || (sourceFilter === "landscape" && wideLoading) ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-sm text-muted-foreground">
                Aucun média pour ces filtres. Glissez-déposez ou importez un fichier pour alimenter la bibliothèque.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                {pageItems.map((m) => (
                  <Tile
                    key={m.url}
                    item={m}
                    selected={value.includes(m.url)}
                    badge={multiple ? value.indexOf(m.url) + 1 || null : null}
                    expectedOrientation={format}
                    onSelect={() => toggle(m)}
                    onDelete={m.source === "library" ? () => void removeFromLibrary(m) : undefined}
                    onOrientation={(o) => {
                      noteOrientation(m, o);
                      void setOrientationOnce(m, o);
                    }}

                  />
                ))}
              </div>
            )}

            {!loading && filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <span className="text-[11px] text-muted-foreground">
                  {filtered.length} résultats · page {page + 1}/{pageCount}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Précédent
                  </Button>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <Button
                      key={i}
                      type="button"
                      size="sm"
                      variant={i === page ? "default" : "ghost"}
                      className="h-7 w-7 p-0 text-[11px]"
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {value.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[11px]"
            onClick={() => onChange([])}
          >
            Vider
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground">
          {value.length === 0
            ? "aucun média — le moteur retombe sur les assets de la fiche"
            : `${value.length}${multiple ? `/${max}` : ""} sélectionné${value.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((m, i) => (
            <div key={m.url} className="relative w-20">
              <div className="aspect-[4/3] rounded overflow-hidden border bg-black/90">
                {m.kind === "video" ? (
                  <video src={m.url} muted playsInline preload="metadata" className="w-full h-full object-contain" />
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>
              {multiple && (
                <span className="absolute top-0.5 left-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                  {i + 1}
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== m.url))}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-background border h-5 w-5 flex items-center justify-center"
                aria-label="Retirer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaSourceBadge({ source }: { source: PickerMedia["source"] }) {
  return (
    <Badge variant="outline" className="text-[10px]">
      {SOURCE_LABEL[source]}
    </Badge>
  );
}

export default VideoMediaPickerDialog;
