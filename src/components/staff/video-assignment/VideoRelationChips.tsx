import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { AssignmentSource } from "./VideoAssignmentPanels";

/**
 * Compteurs POI / Destination affichés sur les miniatures des sous-onglets
 * (même mécanisme que l'onglet Génériques).
 *
 * - source "generic" : tables de liaison generic_video_pois / generic_video_destinations
 * - source "document" (vidéos de fiche) : colonnes uniques business_documents.poi_id /
 *   business_documents.destination_id → 0 ou 1 par vidéo.
 */
export interface RelationCounts { poi: number; dest: number }

interface CtxValue {
  counts: Map<string, RelationCounts>;
  refresh: () => void;
}

const RelationCountsCtx = createContext<CtxValue>({ counts: new Map(), refresh: () => {} });

const CHUNK = 200;

export const VideoRelationCountsProvider = ({
  items,
  children,
}: {
  items: { id: string; source: AssignmentSource }[];
  children: React.ReactNode;
}) => {
  const [counts, setCounts] = useState<Map<string, RelationCounts>>(new Map());
  const [tick, setTick] = useState(0);

  const docIds = useMemo(
    () => items.filter(i => i.source === "document").map(i => i.id),
    [items],
  );
  const genIds = useMemo(
    () => items.filter(i => i.source === "generic").map(i => i.id),
    [items],
  );
  const docKey = docIds.join(",");
  const genKey = genIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const map = new Map<string, RelationCounts>();

      const docs = docKey ? docKey.split(",") : [];
      for (let i = 0; i < docs.length; i += CHUNK) {
        const chunk = docs.slice(i, i + CHUNK);
        const { data } = await supabase
          .from("business_documents")
          .select("id, poi_id, destination_id")
          .in("id", chunk);
        ((data as any[]) || []).forEach((d: any) => {
          map.set(d.id, { poi: d.poi_id ? 1 : 0, dest: d.destination_id ? 1 : 0 });
        });
      }

      const gens = genKey ? genKey.split(",") : [];
      for (let i = 0; i < gens.length; i += CHUNK) {
        const chunk = gens.slice(i, i + CHUNK);
        const [{ data: pois }, { data: dests }] = await Promise.all([
          supabase.from("generic_video_pois" as any).select("generic_video_id").in("generic_video_id", chunk) as any,
          supabase.from("generic_video_destinations" as any).select("generic_video_id").in("generic_video_id", chunk) as any,
        ]);
        chunk.forEach(id => { if (!map.has(id)) map.set(id, { poi: 0, dest: 0 }); });
        ((pois as any[]) || []).forEach((l: any) => {
          const c = map.get(l.generic_video_id); if (c) c.poi += 1;
        });
        ((dests as any[]) || []).forEach((l: any) => {
          const c = map.get(l.generic_video_id); if (c) c.dest += 1;
        });
      }

      if (!cancelled) setCounts(map);
    };
    if (docKey || genKey) load();
    else setCounts(new Map());
    return () => { cancelled = true; };
  }, [docKey, genKey, tick]);

  const refresh = useCallback(() => setTick(t => t + 1), []);
  const value = useMemo(() => ({ counts, refresh }), [counts, refresh]);

  return <RelationCountsCtx.Provider value={value}>{children}</RelationCountsCtx.Provider>;
};

export const useVideoRelationCounts = () => useContext(RelationCountsCtx);

const chipClass = (active: boolean, tone: "emerald" | "rose" | "cyan") =>
  cn(
    "text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors",
    active
      ? tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
        : tone === "rose"
          ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25"
          : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/25"
      : "text-muted-foreground hover:text-foreground hover:underline",
  );

/** Rangée de chips POI / Dest. / Tags sous la miniature. */
export const VideoRelationChips = ({
  videoId,
  onOpenPoi,
  onOpenDest,
  onOpenTags,
}: {
  videoId: string;
  onOpenPoi: () => void;
  onOpenDest: () => void;
  onOpenTags?: () => void;
}) => {
  const { counts } = useVideoRelationCounts();
  const c = counts.get(videoId) || { poi: 0, dest: 0 };

  return (
    <div className="flex flex-wrap gap-1 pt-1">
      <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPoi(); }} className={chipClass(c.poi > 0, "emerald")}>
        {c.poi > 0 ? `✓ ${c.poi} POI` : "+ POI"}
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onOpenDest(); }} className={chipClass(c.dest > 0, "rose")}>
        {c.dest > 0 ? `✓ ${c.dest} Dest.` : "+ Dest."}
      </button>
      {onOpenTags && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpenTags(); }} className={chipClass(false, "cyan")}>
          + Tags
        </button>
      )}
    </div>
  );
};
