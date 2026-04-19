import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20, formatRating } from "@/lib/ratingUtils";

interface TimelineItem {
  id: string;
  name: string;
  hook: string | null;
  ratingOn20: number | null;
  start_time: number | null;
  end_time: number | null;
  sort_order: number;
}

interface Props {
  genericVideoId: string;
  currentTime: number;
}

const GenericVideoTimelineOverlay = ({ genericVideoId, currentTime }: Props) => {
  const [items, setItems] = useState<TimelineItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: poiLinks }, { data: bizLinks }] = await Promise.all([
        supabase
          .from("generic_video_pois" as any)
          .select("poi_id, sort_order, start_time, end_time")
          .eq("generic_video_id", genericVideoId) as any,
        supabase
          .from("generic_video_businesses" as any)
          .select("business_id, sort_order, start_time, end_time")
          .eq("generic_video_id", genericVideoId) as any,
      ]);

      const ids = [
        ...((poiLinks || []).map((l: any) => l.poi_id)),
        ...((bizLinks || []).map((l: any) => l.business_id)),
      ];
      if (ids.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }

      const { data: bizs } = await supabase
        .from("businesses")
        .select(
          "id, name, hook_fr, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, trustpilot_rating, trustpilot_review_count, kayak_rating, kayak_review_count, tourradar_rating, tourradar_review_count"
        )
        .in("id", ids);

      const map = new Map<string, any>();
      (bizs || []).forEach((b: any) => map.set(b.id, b));

      const built: TimelineItem[] = [];
      (poiLinks || []).forEach((l: any) => {
        const b = map.get(l.poi_id);
        if (!b) return;
        built.push({
          id: l.poi_id,
          name: b.name,
          hook: b.hook_fr ?? null,
          ratingOn20: computeWeightedRatingOn20(collectRatingSources(b)),
          start_time: l.start_time,
          end_time: l.end_time,
          sort_order: l.sort_order ?? 0,
        });
      });
      (bizLinks || []).forEach((l: any) => {
        const b = map.get(l.business_id);
        if (!b) return;
        built.push({
          id: l.business_id,
          name: b.name,
          hook: b.hook_fr ?? null,
          ratingOn20: computeWeightedRatingOn20(collectRatingSources(b)),
          start_time: l.start_time,
          end_time: l.end_time,
          sort_order: l.sort_order ?? 0,
        });
      });
      built.sort((a, b) => a.sort_order - b.sort_order);
      if (!cancelled) setItems(built);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [genericVideoId]);

  // Cumulative: show every item whose start_time has been reached
  const visibleItems = useMemo(() => {
    return items.filter((it) => (it.start_time ?? 0) <= currentTime);
  }, [items, currentTime]);

  if (visibleItems.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[60%] pointer-events-none">
      {visibleItems.map((it) => (
        <div
          key={it.id}
          className="rounded-md bg-black/65 backdrop-blur-sm px-3 py-2 text-white shadow-lg border border-white/10 animate-in fade-in slide-in-from-left-2 duration-300"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold leading-tight line-clamp-1">{it.name}</p>
            {it.ratingOn20 != null && (
              <span className="text-xs font-bold text-gold shrink-0">
                {formatRating(it.ratingOn20)}/20
              </span>
            )}
          </div>
          {it.hook && (
            <p className="text-[11px] text-white/85 leading-snug mt-0.5 line-clamp-2">
              {it.hook}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default GenericVideoTimelineOverlay;
