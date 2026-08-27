import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { Check, Copy, Film, Image as ImageIcon, Loader2, Maximize2, Pencil, Play, Pause, Trash2, Upload, X } from "lucide-react";
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
  source:
    | "fiche"
    | "generic"
    | "badged"
    | "library"
    | "generic_video"
    | "other"
    | "render_feed"
    | "render_promo"
    | "render_storyboard"
    | "render_showcase"
    | "render_corporate";
  scope?: "global" | "business";
  libraryId?: string;
  /** ID base de la vidéo/média source (business_documents, generic_videos, bibliothèque). */
  mediaId?: string | null;
  orientation?: "landscape" | "portrait" | "square" | null;
  /** Fiche d'origine (utile pour les médias cross-fiches : générique). */
  ownerName?: string | null;
  /** Le média est aussi publié sur la fiche courante. */
  onFiche?: boolean;
  /** Badges actifs du média (documents de fiche uniquement). */
  badges?: string[];
  /** Document vidéo marqué « No logo » (colonne hide_logo). */
  hideLogo?: boolean;
};

type TypeFilter = "all" | "image" | "video";
type SourceFilter =
  | "none"
  | "all"
  | "fiche"
  | "generic"
  | "generic_video"
  | "landscape"
  | "other"
  | "library_business"
  | "library_global"
  | "badged"
  | "render_feed"
  | "render_promo"
  | "render_storyboard"
  | "render_showcase"
  | "render_corporate";

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
  badged: "Badgé",
  render_feed: "Rendu Scénario Feed",
  render_promo: "Rendu Promo business",
  render_storyboard: "Rendu Montage manuel",
  render_showcase: "Rendu Scénario auto établissement",
  render_corporate: "Rendu Scénario auto Corporate",
};

/* ------------------------------------------------------------------ tiles */

function Tile({
  item,
  selected,
  badge,
  expectedOrientation,
  gridCell = false,
  onSelect,
  onDelete,
  onOrientation,
}: {
  item: PickerMedia;
  selected: boolean;
  badge?: number | null;
  expectedOrientation?: "landscape" | "portrait";
  /** true = la tuile remplit une cellule de grille (4 colonnes) au lieu de son ratio natif. */
  gridCell?: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onOrientation?: (o: "landscape" | "portrait" | "square") => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [full, setFull] = useState(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait" | "square" | null>(
    item.orientation ?? null,
  );
  const [ratio, setRatio] = useState<number>(
    item.orientation === "portrait" ? 9 / 16 : item.orientation === "square" ? 1 : 16 / 9,
  );
  const [duration, setDuration] = useState<number | null>(item.duration ?? null);

  const isVideoTile = item.kind === "video";
  // En grille (4 colonnes) la tuile remplit sa cellule ; sinon ratio natif demi-taille.
  const freeSize = isVideoTile && !gridCell;
  const BASE = 300;
  const width = ratio >= 1 ? BASE / 2 : (BASE / 2) * ratio;
  const height = ratio >= 1 ? BASE / 2 / ratio : BASE / 2;

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

  const copyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.mediaId) return;
    try {
      await navigator.clipboard.writeText(item.mediaId);
      toast.success("ID copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <div
      className={`relative min-w-0 ${freeSize ? "shrink-0" : "w-full"}`}
      style={freeSize ? { width: Math.round(width) } : undefined}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`relative w-full rounded-md overflow-hidden border-2 bg-black/90 ${
          freeSize ? "" : "aspect-[4/3]"
        } ${selected ? "border-primary" : "border-transparent hover:border-primary/40"}`}
        style={freeSize ? { height: Math.round(height) } : undefined}
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
                if (v.videoWidth && v.videoHeight) {
                  setRatio(v.videoWidth / v.videoHeight);
                  noteOrientation(ratioToOrientation(v.videoWidth, v.videoHeight));
                }
                if (Number.isFinite(v.duration)) setDuration(v.duration);
                // Sans poster, la vignette reste noire : on décale la tête de
                // lecture pour forcer l'affichage d'une image réelle.
                if (v.currentTime === 0 && Number.isFinite(v.duration) && v.duration > 0.2) {
                  try {
                    v.currentTime = Math.min(0.5, v.duration / 2);
                  } catch {
                    /* ignore */
                  }
                }
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

        <span
          onClick={(e) => {
            e.stopPropagation();
            setFull(true);
          }}
          role="button"
          aria-label="Voir en plein écran"
          title="Voir en plein écran"
          className={`absolute rounded-full bg-white/85 text-black w-7 h-7 flex items-center justify-center hover:bg-white transition ${
            item.kind === "video" && isInternalVideoUrl(item.url) ? "bottom-1 right-9" : "bottom-1 right-1"
          }`}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </span>


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

      {full && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setFull(false);
          }}
        >
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-4 right-4 h-9 w-9 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setFull(false);
            }}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </Button>
          {item.kind === "video" && isInternalVideoUrl(item.url) ? (
            <video
              src={item.url}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={item.kind === "video" ? item.thumbnail || "" : item.url}
              alt={item.title || ""}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {!!item.badges?.length && (
        <div className="mt-1 flex flex-wrap gap-1">
          {item.badges.map((b) => (
            <span
              key={b}
              className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-semibold uppercase"
            >
              {b}
            </span>
          ))}
        </div>
      )}


      {item.title && (
        <p className="mt-1 text-[10px] text-muted-foreground truncate" title={item.title}>
          {item.title}
        </p>
      )}

      {item.ownerName && (
        <p className="text-[10px] font-semibold truncate" title={item.ownerName}>
          {item.ownerName}
        </p>
      )}

      {item.mediaId && (
        <button
          type="button"
          onClick={copyId}
          title={`Copier l'ID ${item.mediaId}`}
          className="mt-0.5 flex min-w-0 max-w-full items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-foreground"
        >
          <Copy className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{item.mediaId}</span>
        </button>
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
          mediaId: r.id,
        });
      }

      // 2) Vidéos badgées de TOUTES les fiches (tous badges confondus, pas
      //    seulement « Generic ») : c'est le corpus du filtre « Tous les badges ».
      const badgeLinks: any[] = [];
      for (let page = 0; page < 20; page++) {
        const from = page * 1000;
        const { data, error } = await supabase
          .from("business_document_badges")
          .select("document_id, badge_id")
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        badgeLinks.push(...data);
        if (data.length < 1000) break;
      }
      const badgeNameById = new Map<string, string>();
      const allBadgeIds = [...new Set(badgeLinks.map((l) => String(l.badge_id)))];
      for (let i = 0; i < allBadgeIds.length; i += 200) {
        const { data } = await supabase
          .from("badges")
          .select("id, name_fr")
          .in("id", allBadgeIds.slice(i, i + 200));
        for (const b of data ?? []) badgeNameById.set(String(b.id), String((b as any).name_fr ?? ""));
      }
      const badgesByDoc = new Map<string, string[]>();
      for (const l of badgeLinks) {
        const name = badgeNameById.get(String(l.badge_id));
        if (!name) continue;
        const key = String(l.document_id);
        badgesByDoc.set(key, [...(badgesByDoc.get(key) ?? []), name]);
      }
      const badgedDocIds = [...badgesByDoc.keys()];

      if (badgedDocIds.length) {
        const badgedDocs: any[] = [];
        for (let i = 0; i < badgedDocIds.length; i += 200) {
          const { data, error } = await supabase
            .from("business_documents")
            .select("id, url, name, thumbnail_url, business_id, hide_logo, orientation, youtube_video_url, instagram_video_url, tiktok_video_url")
            .eq("type", "video")
            .in("id", badgedDocIds.slice(i, i + 200));
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
          const badges = badgesByDoc.get(String(d.id)) ?? [];
          out.push({
            url: mediaUrl,
            kind: "video",
            title: d.name ?? "Vidéo",
            thumbnail: d.thumbnail_url ?? null,
            source: badges.some((b) => /^generic$/i.test(b)) ? "generic" : "badged",
            mediaId: String(d.id),
            ownerName: ownerNames.get(String(d.business_id)) ?? null,
            hideLogo: !!d.hide_logo,
            orientation: (d.orientation as any) ?? null,
            badges,
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
            .select("id, url, name, thumbnail_url, type, hide_logo, youtube_video_url, instagram_video_url, tiktok_video_url")
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
            mediaId: String(d.id),
            hideLogo: !!d.hide_logo,
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
          mediaId: String(g.id),
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
              .select("id, url, name, thumbnail_url, hide_logo, youtube_video_url, instagram_video_url, tiktok_video_url")
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
              mediaId: String(d.id),
              ownerName: o.name,
              hideLogo: !!d.hide_logo,
            });
          }
        }
      }

      // 6) Rendus déjà générés (jobs terminés) : Scénario Feed et Promo business.
      //    Ce sont des MP4 internes, réutilisables comme média de fond d'un montage.
      const { data: jobs } = await supabase
        .from("video_jobs")
        .select("id, title, output_url, template_id, duration_sec, business_id, created_at")
        .eq("status", "done")
        .not("output_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(600);
      const jobRows = (jobs ?? []).filter((j: any) => {
        const t = String(j.template_id ?? "");
        return (
          t.startsWith("feed-template") ||
          t.startsWith("business-promo") ||
          t.startsWith("storyboard") ||
          t.startsWith("business-showcase") ||
          t.startsWith("corporate")
        );
      });
      if (jobRows.length) {
        const jobBizIds = [...new Set(jobRows.map((j: any) => j.business_id).filter(Boolean))];
        const jobOwners = new Map<string, string>();
        for (let i = 0; i < jobBizIds.length; i += 200) {
          const { data: owners } = await supabase
            .from("businesses")
            .select("id, name")
            .in("id", jobBizIds.slice(i, i + 200) as string[]);
          for (const o of owners ?? []) jobOwners.set(String(o.id), o.name);
        }
        for (const j of jobRows as any[]) {
          const url = typeof j.output_url === "string" ? j.output_url.trim() : "";
          if (!url) continue;
          const t = String(j.template_id ?? "");
          out.push({
            url,
            kind: "video",
            title:
              j.title ||
              (t.startsWith("business-promo")
                ? "Promo business"
                : t.startsWith("storyboard")
                  ? "Montage manuel"
                  : t.startsWith("business-showcase")
                    ? "Scénario auto établissement"
                    : t.startsWith("corporate")
                      ? "Scénario auto Corporate"
                      : "Scénario Feed"),
            duration: j.duration_sec != null ? Number(j.duration_sec) : null,
            orientation: t.includes("landscape") ? "landscape" : "portrait",
            source: t.startsWith("business-promo")
              ? "render_promo"
              : t.startsWith("storyboard")
                ? "render_storyboard"
                : t.startsWith("business-showcase")
                  ? "render_showcase"
                  : t.startsWith("corporate")
                    ? "render_corporate"
                    : "render_feed",
            mediaId: String(j.id),
            ownerName: j.business_id ? (jobOwners.get(String(j.business_id)) ?? null) : null,
          });
        }
      }

      // Déduplication par URL, la bibliothèque staff prime (elle porte les métadonnées)
      const seen = new Set<string>();
      const deduped = out
        // Les vidéos externes (YouTube / TikTok / Instagram) ne sont pas des fichiers
        // téléchargeables : le moteur de rendu ne peut pas les monter → jamais affichées.
        .filter((m) => (m.kind === "video" ? isInternalVideoUrl(m.url) : true))
        // Les vidéos marquées « No logo » (colonne hide_logo, titre, URL ou badge) ne sont
        // jamais montables ici.
        .filter((m) => {
          if (m.hideLogo) return false;
          const hay = `${m.title ?? ""} ${m.url} ${(m.badges ?? []).join(" ")}`.toLowerCase().replace(/[\s-]+/g, "_");
          return !hay.includes("no_logo");
        })
        .filter((m) => {
          const k = m.url.trim().toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        // un média badgé qui appartient aussi à la fiche courante reste visible dans « Fiche »
        .map((m) => ({ ...m, onFiche: ficheUrls.has(m.url.trim().toLowerCase()) }));

      // Badges actifs des vidéos de fiche (tous badges, pas seulement « Generic »).
      const docIds = [
        ...new Set(
          deduped
            .filter(
              (m) =>
                m.mediaId &&
                (m.badges ?? []).length === 0 &&
                (m.source === "fiche" || m.source === "generic" || m.source === "badged" || m.source === "other"),
            )
            .map((m) => String(m.mediaId)),
        ),
      ];
      if (docIds.length) {
        const links: any[] = [];
        for (let i = 0; i < docIds.length; i += 200) {
          const { data } = await supabase
            .from("business_document_badges")
            .select("document_id, badge_id")
            .in("document_id", docIds.slice(i, i + 200));
          if (data) links.push(...data);
        }
        const badgeIds = [...new Set(links.map((l) => String(l.badge_id)))];
        const badgeNames = new Map<string, string>();
        for (let i = 0; i < badgeIds.length; i += 200) {
          const { data } = await supabase
            .from("badges")
            .select("id, name_fr")
            .in("id", badgeIds.slice(i, i + 200));
          for (const b of data ?? []) badgeNames.set(String(b.id), String((b as any).name_fr ?? ""));
        }
        const byDoc = new Map<string, string[]>();
        for (const l of links) {
          const name = badgeNames.get(String(l.badge_id));
          if (!name) continue;
          const key = String(l.document_id);
          byDoc.set(key, [...(byDoc.get(key) ?? []), name]);
        }
        for (const m of deduped) {
          if (m.mediaId && byDoc.has(String(m.mediaId))) m.badges = byDoc.get(String(m.mediaId));
        }
      }

      // Exclusion « No logo » après hydratation des badges (un badge no_logo est aussi exclu).
      const cleaned = deduped.filter(
        (m) => !m.hideLogo && !(m.badges ?? []).some((b) => b.toLowerCase().replace(/[\s-]+/g, "_").includes("no_logo")),
      );
      deduped.length = 0;
      deduped.push(...cleaned);


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
 * Vidéos 16:9 : lecture directe en base (colonne `orientation` mesurée une fois
 * pour toutes par la fonction `backfill-video-orientation`, qui lit l'entête MP4).
 * Aucune condition de fiche, de badge ou de bibliothèque, aucun scan navigateur.
 */
export function useLandscapeVideos(enabled: boolean) {
  const [items, setItems] = useState<PickerMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(0);
  const [measuring, setMeasuring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: docs }, { data: gen }, { count: pendDocs }, { count: pendGen }] = await Promise.all([
        supabase
          .from("business_documents")
          .select("id, url, name, thumbnail_url, business_id, hide_logo, media_width, media_height")
          .eq("type", "video")
          .eq("orientation", "landscape")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("generic_videos" as any)
          .select("id, url, name, thumbnail_url")
          .eq("orientation", "landscape")
          .order("sort_order", { ascending: true })
          .limit(500),
        supabase
          .from("business_documents")
          .select("id", { count: "exact", head: true })
          .eq("type", "video")
          .is("orientation_checked_at", null),
        supabase
          .from("generic_videos" as any)
          .select("id", { count: "exact", head: true })
          .is("orientation_checked_at", null),
      ]);

      const ownerIds = [...new Set((docs ?? []).map((d: any) => d.business_id).filter(Boolean))];
      const ownerNames = new Map<string, string>();
      for (let i = 0; i < ownerIds.length; i += 200) {
        const { data: owners } = await supabase
          .from("businesses")
          .select("id, name")
          .in("id", ownerIds.slice(i, i + 200) as string[]);
        for (const o of owners ?? []) ownerNames.set(String(o.id), o.name);
      }

      const out: PickerMedia[] = [];
      for (const d of (docs ?? []) as any[]) {
        const url = typeof d.url === "string" ? d.url.trim() : "";
        if (!url || !isInternalVideoUrl(url) || !!d.hide_logo) continue;
        out.push({
          url,
          kind: "video",
          title: d.name ?? "Vidéo",
          thumbnail: d.thumbnail_url ?? null,
          source: "other",
          orientation: "landscape",
          mediaId: String(d.id),
          ownerName: ownerNames.get(String(d.business_id)) ?? null,
          hideLogo: !!d.hide_logo,
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
          orientation: "landscape",
          mediaId: String(g.id),
        });
      }
      const seen = new Set<string>();
      setItems(out.filter((m) => (seen.has(m.url.toLowerCase()) ? false : (seen.add(m.url.toLowerCase()), true))));
      setPending((pendDocs ?? 0) + (pendGen ?? 0));
    } catch (e: any) {
      toast.error(`Vidéos 16:9 : ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  /** Mesure les vidéos encore non analysées, par lots, jusqu'à épuisement. */
  const measure = useCallback(async () => {
    setMeasuring(true);
    try {
      for (const table of ["generic_videos", "business_documents"] as const) {
        for (let pass = 0; pass < 40; pass++) {
          const { data, error } = await supabase.functions.invoke("backfill-video-orientation", {
            body: { table, limit: 300, concurrency: 10 },
          });
          if (error) throw error;
          const res = data as any;
          setPending(Number(res?.remaining ?? 0));
          if (!res?.picked) break;
        }
      }
      toast.success("Mesure des formats terminée");
      await load();
    } catch (e: any) {
      toast.error(`Mesure impossible : ${e.message ?? e}`);
    } finally {
      setMeasuring(false);
    }
  }, [load]);

  return { items, loading, pending, measuring, measure, reload: load };
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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(allow === "all" ? "all" : allow);
  // Aucun chargement à l'ouverture : on attend que l'utilisateur choisisse une
  // source dans le menu déroulant (les requêtes sont lourdes).
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("none");
  const { items, loading, reload, setItems } = useVideoMediaSources(
    businessId,
    open && sourceFilter !== "none",
    otherSlug,
  );
  const [wideAsked, setWideAsked] = useState(false);
  const {
    items: wideVideos,
    loading: wideLoading,
    pending: widePending,
    measuring: wideMeasuring,
    measure: measureWide,
  } = useLandscapeVideos(open && wideAsked);
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<"all" | "landscape" | "portrait" | "square">("all");
  const [badgeFilter, setBadgeFilter] = useState<string>("all");
  const [uploadScope, setUploadScope] = useState<"global" | "business">(businessId ? "business" : "global");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (allow !== "all") setTypeFilter(allow);
  }, [allow]);

  useEffect(() => {
    // Un établissement lié : on ouvre directement sur ses propres médias.
    if (open) setSourceFilter(businessId ? "fiche" : "none");
  }, [open, businessId]);


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
      case "none":
        return false;
      case "all":
        return true;
      case "fiche":
        return m.source === "fiche" || !!m.onFiche;
      case "generic":
        return m.source === "generic";
      case "badged":
        // Toutes les vidéos internes portant au moins un badge (toutes fiches).
        return (m.badges ?? []).length > 0;
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
      case "render_feed":
        return m.source === "render_feed";
      case "render_promo":
        return m.source === "render_promo";
      case "render_storyboard":
        return m.source === "render_storyboard";
      case "render_showcase":
        return m.source === "render_showcase";
      case "render_corporate":
        return m.source === "render_corporate";
    }
  };

  useEffect(() => {
    if (sourceFilter === "landscape") setWideAsked(true);
  }, [sourceFilter]);

  /** Résultats de la source + recherche, avant filtres format / badge. */
  const sourceScoped = useMemo(() => {
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

  /** Résultats après filtre format uniquement (base des options de badges). */
  const formatScoped = useMemo(
    () => (formatFilter === "all" ? sourceScoped : sourceScoped.filter((m) => m.orientation === formatFilter)),
    [sourceScoped, formatFilter],
  );

  /** Badges actifs présents dans la source + format sélectionnés, avec compteurs. */
  const badgeOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of formatScoped) for (const b of m.badges ?? []) map.set(b, (map.get(b) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [formatScoped]);


  useEffect(() => {
    if (badgeFilter !== "all" && !badgeOptions.some(([b]) => b === badgeFilter)) setBadgeFilter("all");
  }, [badgeOptions, badgeFilter]);

  const formatCounts = useMemo(() => {
    let landscape = 0;
    let portrait = 0;
    let square = 0;
    for (const m of sourceScoped) {
      if (m.orientation === "landscape") landscape++;
      else if (m.orientation === "portrait") portrait++;
      else if (m.orientation === "square") square++;
    }
    return { all: sourceScoped.length, landscape, portrait, square };
  }, [sourceScoped]);

  const filtered = useMemo(
    () =>
      sourceScoped.filter((m) => {
        if (formatFilter !== "all" && m.orientation !== formatFilter) return false;
        if (badgeFilter !== "all" && !(m.badges ?? []).includes(badgeFilter)) return false;
        return true;
      }),
    [sourceScoped, formatFilter, badgeFilter],
  );

  const PAGE_SIZE = 32;
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [sourceFilter, typeFilter, search, otherSlug, open, formatFilter, badgeFilter]);
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
      renderFeed: typeBase.filter((m) => m.source === "render_feed").length,
      renderPromo: typeBase.filter((m) => m.source === "render_promo").length,
      badged: typeBase.filter((m) => (m.badges ?? []).length > 0).length,
      renderStoryboard: typeBase.filter((m) => m.source === "render_storyboard").length,
      renderShowcase: typeBase.filter((m) => m.source === "render_showcase").length,
      renderCorporate: typeBase.filter((m) => m.source === "render_corporate").length,
    }),
    [typeBase],
  );

  /** Miniatures des URLs sélectionnées absentes de la bibliothèque chargée. */
  const [fallbackThumbs, setFallbackThumbs] = useState<Record<string, string | null>>({});
  useEffect(() => {
    const missing = value.filter(
      (u) => u && !items.some((m) => m.url === u) && !(u in fallbackThumbs),
    );
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const [docs, gen] = await Promise.all([
        supabase.from("business_documents").select("url, thumbnail_url").in("url", missing),
        supabase.from("generic_videos").select("url, thumbnail_url").in("url", missing),
      ]);
      if (cancelled) return;
      const next: Record<string, string | null> = {};
      missing.forEach((u) => {
        next[u] = null;
      });
      [...(docs.data ?? []), ...(gen.data ?? [])].forEach((r: any) => {
        if (r?.url) next[r.url] = r.thumbnail_url ?? null;
      });
      setFallbackThumbs((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, items]);


  // Les vignettes sélectionnées doivent rester lisibles AVANT toute ouverture
  // du sélecteur (la bibliothèque `items` n'est chargée qu'à l'ouverture) :
  // on déduit le type par l'extension et on récupère la vraie miniature en base.
  const selectedItems = value
    .map((u) => {
      const found = items.find((m) => m.url === u);
      if (found) return found;
      const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);
      return {
        url: u,
        kind: isVideo ? "video" : "image",
        source: "fiche",
        thumbnail: fallbackThumbs[u] ?? null,
      } as PickerMedia;
    })
    .filter(Boolean);


  const activeTypeLabel =
    allow === "image" || typeFilter === "image"
      ? "images"
      : allow === "video" || typeFilter === "video"
        ? "vidéos"
        : "médias";

  /** Compteur affiché : « … » tant qu'aucune source n'est choisie (rien n'est chargé). */
  const c = (n: number) => (sourceFilter === "none" ? "…" : n);


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
            className={`w-[90vw] max-w-[90vw] max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto ${dragOver ? "ring-2 ring-primary" : ""}`}
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
                <option value="none">— Choisir une source —</option>
                <option value="all">Toutes les sources ({c(counts.all)})</option>
                <option value="fiche">Fiche · {activeTypeLabel} ({c(counts.fiche)})</option>
                <option value="generic_video">Vidéos génériques ({c(counts.genericVideo)})</option>
                <option value="generic">Badge Generic ({c(counts.generic)})</option>
                <option value="badged">Vidéos badgées · toutes fiches ({c(counts.badged)})</option>
                <option value="landscape">Vidéos 16:9 · toutes fiches + génériques ({wideAsked ? counts.landscape : "…"})</option>
                <option value="other">Autre fiche par slug · {activeTypeLabel} ({c(counts.other)})</option>
                <option value="library_business">Bibliothèque fiche · {activeTypeLabel} ({c(counts.libBiz)})</option>
                <option value="library_global">Bibliothèque globale · {activeTypeLabel} ({c(counts.libGlobal)})</option>
                <option value="render_feed">Rendus · Scénario Feed ({c(counts.renderFeed)})</option>
                <option value="render_promo">Rendus · Promo business ({c(counts.renderPromo)})</option>
                <option value="render_storyboard">Rendus · Montages manuels ({c(counts.renderStoryboard)})</option>
                <option value="render_showcase">Rendus · Scénario auto établissement ({c(counts.renderShowcase)})</option>
                <option value="render_corporate">Rendus · Scénario auto Corporate ({c(counts.renderCorporate)})</option>
              </select>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as typeof formatFilter)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
                title="Filtrer par format"
              >
                <option value="all">Tous les formats ({formatCounts.all})</option>
                <option value="landscape">Paysage 16:9 ({formatCounts.landscape})</option>
                <option value="portrait">Portrait 9:16 ({formatCounts.portrait})</option>
                <option value="square">Carré 1:1 ({formatCounts.square})</option>
              </select>
              <select
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
                title="Filtrer par badge"
              >
                <option value="all">Tous les badges ({badgeOptions.length})</option>
                {badgeOptions.map(([b, n]) => (
                  <option key={b} value={b}>
                    {b} ({n})
                  </option>
                ))}
              </select>

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

            <div className="flex flex-wrap items-center gap-2 border-b pb-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (titre, fiche, URL)…"
                className="h-8 w-56 text-xs"
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
              {sourceFilter === "other" && (
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
              )}

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

            <p className="text-[11px] text-muted-foreground">
              Bibliothèque fiche / globale = les médias que le staff importe (upload/drag&drop) dans{" "}
              <code>video_media_library</code> : « fiche » = rattachés à l’établissement associé, « globale » =
              réutilisables partout, hors des médias publics de la fiche.
            </p>

            {sourceFilter === "landscape" && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>
                  {wideVideos.length} vidéo{wideVideos.length > 1 ? "s" : ""} 16:9 en base (toutes fiches + génériques),
                  format mesuré depuis l'entête réelle du fichier.
                </span>
                {widePending > 0 && (
                  <>
                    <span className="text-amber-600">{widePending} vidéo(s) jamais mesurée(s)</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      disabled={wideMeasuring}
                      onClick={() => void measureWide()}
                    >
                      {wideMeasuring ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Mesurer les formats
                    </Button>
                  </>
                )}
              </div>
            )}

            {sourceFilter === "none" ? (
              <p className="py-10 text-sm text-muted-foreground">
                Choisissez d'abord une <b>source</b> dans le menu déroulant : rien n'est chargé avant votre sélection.
              </p>
            ) : loading || (sourceFilter === "landscape" && wideLoading) ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-sm text-muted-foreground">
                Aucun média pour ces filtres. Glissez-déposez ou importez un fichier pour alimenter la bibliothèque.
              </p>
            ) : (
              (() => {
                const renderTile = (m: PickerMedia, gridCell = false) => (
                  <Tile
                    key={m.url}
                    item={m}
                    selected={value.includes(m.url)}
                    badge={multiple ? value.indexOf(m.url) + 1 || null : null}
                    expectedOrientation={format}
                    gridCell={gridCell}
                    onSelect={() => toggle(m)}
                    onDelete={m.source === "library" ? () => void removeFromLibrary(m) : undefined}
                    onOrientation={(o) => {
                      noteOrientation(m, o);
                      void setOrientationOnce(m, o);
                    }}
                  />
                );
                const vids = pageItems.filter((m) => m.kind === "video");
                const imgs = pageItems.filter((m) => m.kind === "image");
                return (
                  <div className="space-y-5 pt-2">
                    {vids.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Vidéos · {vids.length}
                        </div>
                        {/* Vignettes de taille fixe (~220px) quel que soit le format et la largeur du popup. */}
                        <div className="grid w-full max-w-full justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(0,220px))]">
                          {vids.map((m) => renderTile(m, true))}
                        </div>

                      </div>
                    )}
                    {imgs.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Images · {imgs.length}
                        </div>
                        <div className="grid w-full max-w-full justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(0,220px))]">
                          {imgs.map((m) => renderTile(m, true))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
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
        <div className="flex flex-wrap gap-3">
          {selectedItems.map((m, i) => (
            <div key={m.url} className="relative w-64 max-w-full">
              <div id={`sel-media-${i}`} className="rounded-md overflow-hidden border-2 border-border bg-black h-64">
                {m.kind === "video" ? (
                  <video
                    src={m.url}
                    poster={m.thumbnail || undefined}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                ) : (

                  <img src={m.url} alt="" className="w-full h-full object-contain" loading="lazy" />
                )}
              </div>
              {multiple && (
                <span className="absolute top-1 left-1 rounded-full bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(`sel-media-${i}`)?.firstElementChild as any;
                  if (el?.requestFullscreen) el.requestFullscreen();
                  else if (el?.webkitEnterFullscreen) el.webkitEnterFullscreen();
                }}
                title="Plein écran"
                aria-label="Plein écran"
                className="absolute top-1 right-7 bg-black/60 text-white rounded-full h-6 w-6 flex items-center justify-center border border-white/40 hover:bg-black/80"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== m.url))}
                className="absolute top-1 right-0.5 rounded-full bg-black/60 text-white border border-white/40 h-6 w-6 flex items-center justify-center hover:bg-black/80"
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
