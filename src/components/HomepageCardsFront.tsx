import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";
import SlidePanelHome from "@/components/SlidePanelHome";

interface Props {
  city: string;
}

interface FSEntry {
  id: string;
  name: string;
  subcategory_ids: string[];
}

interface CardData {
  // unified card data
  videoId: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  businessName: string | null;
  ownerLogo: string | null;
  ownerName: string | null;
  ownerId: string | null;
  rating: number | null;
  reviewCount: number | null;
  label: string | null;
}

interface MixedSlot {
  key: string;
  kind: "entry" | "extra";
  data: CardData;
}

function deriveThumbnail(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

const HomepageCardsFront = ({ city }: Props) => {
  const [slots, setSlots] = useState<MixedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isFirstLoad.current) setLoading(true);

      // Phase 1: tout ce qui ne dépend de rien — en parallèle
      const [cityRowRes, entriesRes, linksRes, overridesRes, badgesRes, extraRes, orderRes] = await Promise.all([
        supabase.from("cities").select("id").eq("name_fr", city).maybeSingle(),
        supabase.from("front_structure").select("id, name, sort_order, show_in_menu").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        (supabase as any)
          .from("front_structure_homepage_overrides")
          .select("front_structure_id, business_id")
          .eq("city", city),
        supabase.from("badges").select("id, name_fr"),
        (supabase as any)
          .from("front_structure_homepage_extra_cards")
          .select("id, city, business_id, badge_id, video_document_id, title, sort_order")
          .eq("city", city)
          .order("sort_order", { ascending: true }),
        (supabase as any)
          .from("front_structure_homepage_order")
          .select("item_type, item_id, sort_order")
          .eq("city", city)
          .order("sort_order", { ascending: true }),
      ]);

      const cityRowId = (cityRowRes.data as any)?.id || null;

      // Phase 2: docs multi-cités pour cette ville (1 requête parallèle)
      const extraDocIdsRes = cityRowId
        ? await supabase.from("business_document_cities").select("document_id").eq("city_id", cityRowId)
        : { data: [] as any[] };
      const extraDocIds = new Set(((extraDocIdsRes.data as any[]) || []).map((r) => r.document_id));

      const linksByEntry: Record<string, string[]> = {};
      (linksRes.data || []).forEach((l: any) => {
        (linksByEntry[l.front_structure_id] ||= []).push(l.subcategory_id);
      });

      const overrideByEntry: Record<string, string> = {};
      ((overridesRes as any).data || []).forEach((o: any) => {
        overrideByEntry[o.front_structure_id] = o.business_id;
      });

      const badgeMap = new Map<string, string>(
        ((badgesRes.data as any[]) || []).map((b) => [b.id, b.name_fr])
      );

      const entries: FSEntry[] = (entriesRes.data || [])
        .filter((e: any) => e.show_in_menu !== false)
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          subcategory_ids: linksByEntry[e.id] || [],
        }))
        .filter((e: FSEntry) => e.subcategory_ids.length > 0);

      const extraRows: any[] = ((extraRes as any).data || []);

      // Phase 3: pour chaque entrée et chaque carte extra, lancer toutes les requêtes vidéo en parallèle
      const entryDocPromises = entries.map(async (entry) => {
        const overrideBizId = overrideByEntry[entry.id];
        if (overrideBizId) {
          const orFilter = `business_id.eq.${overrideBizId},linked_business_id.eq.${overrideBizId},poi_id.eq.${overrideBizId}`;
          const { data: ovDocs } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
            .eq("type", "video")
            .or(orFilter)
            .in("subcategory_id", entry.subcategory_ids)
            .order("sort_order", { ascending: true })
            .limit(1);
          let candidate: any = (ovDocs && ovDocs[0]) || null;
          if (!candidate) {
            const { data: anyDocs } = await supabase
              .from("business_documents")
              .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
              .eq("type", "video")
              .or(orFilter)
              .order("sort_order", { ascending: true })
              .limit(1);
            candidate = (anyDocs && anyDocs[0]) || null;
          }
          return { entryId: entry.id, candidate };
        }

        // Sans override : lance "own city" et "extra multi-city" en parallèle
        const ownPromise = supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
          .eq("type", "video")
          .eq("city", city)
          .in("subcategory_id", entry.subcategory_ids)
          .order("sort_order", { ascending: true })
          .limit(1);

        const extraPromises: Promise<any>[] = [];
        if (extraDocIds.size > 0) {
          const ids = [...extraDocIds];
          for (let i = 0; i < ids.length; i += 300) {
            const chunk = ids.slice(i, i + 300);
            extraPromises.push(
              Promise.resolve(
                supabase
                  .from("business_documents")
                  .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
                  .eq("type", "video")
                  .in("subcategory_id", entry.subcategory_ids)
                  .in("id", chunk)
                  .order("sort_order", { ascending: true })
                  .limit(1)
              )
            );
          }
        }

        const [ownRes, ...extraResults] = await Promise.all([ownPromise, ...extraPromises]);
        let candidate: any = (ownRes.data && ownRes.data[0]) || null;
        for (const r of extraResults) {
          const e = (r.data && r.data[0]) || null;
          if (e && (!candidate || (e.sort_order ?? 0) < (candidate.sort_order ?? 0))) candidate = e;
        }
        return { entryId: entry.id, candidate };
      });

      const extraCardPromises = extraRows.map(async (card) => {
        // 1) Vidéo spécifique
        if (card.video_document_id) {
          const { data: vDoc } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
            .eq("id", card.video_document_id)
            .maybeSingle();
          if (vDoc) return { cardId: card.id, doc: vDoc };
          const { data: gv } = await (supabase as any)
            .from("generic_videos")
            .select("id, url, thumbnail_url")
            .eq("id", card.video_document_id)
            .maybeSingle();
          if (gv) {
            return {
              cardId: card.id,
              doc: {
                id: gv.id, url: gv.url, thumbnail_url: gv.thumbnail_url,
                business_id: card.business_id, poi_id: null, linked_business_id: null, sort_order: 0,
              },
            };
          }
          return { cardId: card.id, doc: null };
        }

        if (!card.business_id && !card.badge_id) return { cardId: card.id, doc: null };

        let badgeFilteredDocIds: string[] | null = null;
        if (card.badge_id) {
          const { data: badgeDocs } = await supabase
            .from("business_document_badges")
            .select("document_id")
            .eq("badge_id", card.badge_id);
          badgeFilteredDocIds = ((badgeDocs as any[]) || []).map((r) => r.document_id);
          if (badgeFilteredDocIds.length === 0) return { cardId: card.id, doc: null };
        }

        let q = supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
          .eq("type", "video")
          .order("sort_order", { ascending: true })
          .limit(1);
        if (card.business_id) {
          q = q.or(`business_id.eq.${card.business_id},linked_business_id.eq.${card.business_id},poi_id.eq.${card.business_id}`);
        }
        if (badgeFilteredDocIds) q = q.in("id", badgeFilteredDocIds.slice(0, 1000));
        const { data: docs } = await q;
        return { cardId: card.id, doc: (docs && docs[0]) || null };
      });

      const [entryDocResults, extraDocResults] = await Promise.all([
        Promise.all(entryDocPromises),
        Promise.all(extraCardPromises),
      ]);

      const firstDocByEntry: Record<string, any> = {};
      const allBizIds = new Set<string>();
      for (const { entryId, candidate } of entryDocResults) {
        if (candidate) {
          firstDocByEntry[entryId] = candidate;
          const dispId = candidate.poi_id || candidate.linked_business_id || candidate.business_id;
          if (dispId) allBizIds.add(dispId);
          if (candidate.business_id) allBizIds.add(candidate.business_id);
        }
        const ovId = overrideByEntry[entryId];
        if (ovId) allBizIds.add(ovId);
      }
      const extraDocByCard: Record<string, any> = {};
      for (const { cardId, doc } of extraDocResults) {
        if (doc) {
          extraDocByCard[cardId] = doc;
          const dispId = doc.poi_id || doc.linked_business_id || doc.business_id;
          if (dispId) allBizIds.add(dispId);
          if (doc.business_id) allBizIds.add(doc.business_id);
        }
      }
      for (const card of extraRows) if (card.business_id) allBizIds.add(card.business_id);

      // Phase 4 : businesses en parallèle (chunks)
      const bizMap = new Map<string, any>();
      const bizIdsArr = [...allBizIds];
      const bizChunks: Promise<any>[] = [];
      for (let i = 0; i < bizIdsArr.length; i += 300) {
        bizChunks.push(
          Promise.resolve(
            supabase
              .from("businesses")
              .select("id, name, logo_url, computed_rating, rating, total_review_count")
              .in("id", bizIdsArr.slice(i, i + 300))
          )
        );
      }
      const bizResults = await Promise.all(bizChunks);
      bizResults.forEach((r) => (r.data || []).forEach((b: any) => bizMap.set(b.id, b)));

      const entryCards: { key: string; data: CardData }[] = entries.map((entry) => {
        const doc = firstDocByEntry[entry.id];
        const overrideBusinessId = overrideByEntry[entry.id] || null;
        if (!doc) {
          return {
            key: `entry:${entry.id}`,
            data: {
              videoId: null, videoUrl: null, thumbnail: null,
              businessName: overrideBusinessId ? (bizMap.get(overrideBusinessId)?.name || null) : null,
              ownerLogo: null, ownerName: null, ownerId: null,
              rating: null, reviewCount: null,
              label: entry.name,
            },
          };
        }
        const ownerBiz = bizMap.get(doc.business_id) || null;
        const dispId = overrideBusinessId || doc.business_id;
        const dispBiz = bizMap.get(dispId) || null;
        return {
          key: `entry:${entry.id}`,
          data: {
            videoId: doc.id, videoUrl: doc.url,
            thumbnail: doc.thumbnail_url || deriveThumbnail(doc.url),
            businessName: dispBiz?.name || null,
            ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
            ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
            ownerId: ownerBiz?.id || null,
            rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
            reviewCount: dispBiz?.total_review_count ?? null,
            label: entry.name,
          },
        };
      });

      const extraPreviews: { key: string; data: CardData }[] = extraRows.map((card) => {
        const doc = extraDocByCard[card.id];
        const badgeName = card.badge_id ? (badgeMap.get(card.badge_id) || null) : null;
        const label = card.title?.trim() || badgeName || null;
        if (!doc) {
          const biz = card.business_id ? bizMap.get(card.business_id) : null;
          return {
            key: `extra:${card.id}`,
            data: {
              videoId: null, videoUrl: null, thumbnail: null,
              businessName: biz?.name || null,
              ownerLogo: null, ownerName: null, ownerId: null,
              rating: null, reviewCount: null,
              label,
            },
          };
        }
        const ownerBiz = bizMap.get(doc.business_id) || null;
        const dispId = card.business_id || doc.business_id;
        const dispBiz = bizMap.get(dispId) || null;
        return {
          key: `extra:${card.id}`,
          data: {
            videoId: doc.id, videoUrl: doc.url,
            thumbnail: doc.thumbnail_url || deriveThumbnail(doc.url),
            businessName: dispBiz?.name || null,
            ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
            ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
            ownerId: ownerBiz?.id || null,
            rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
            reviewCount: dispBiz?.total_review_count ?? null,
            label,
          },
        };
      });

      const orderMap = new Map<string, number>();
      ((orderRes as any).data || []).forEach((r: any) => {
        orderMap.set(`${r.item_type}:${r.item_id}`, r.sort_order);
      });

      const all: MixedSlot[] = [
        ...entryCards.map((p): MixedSlot => ({ key: p.key, kind: "entry", data: p.data })),
        ...extraPreviews.map((p): MixedSlot => ({ key: p.key, kind: "extra", data: p.data })),
      ];

      console.log("[HomepageCardsFront]", city, {
        entries: entryCards.length,
        extras: extraPreviews.length,
        total: all.length,
        orderRows: ((orderRes as any).data || []).length,
      });

      const ordered = all.filter((r) => orderMap.has(r.key))
        .sort((a, b) => orderMap.get(a.key)! - orderMap.get(b.key)!);
      const remaining = all.filter((r) => !orderMap.has(r.key));
      const mixed = [...ordered, ...remaining];

      if (!cancelled) {
        setSlots(mixed);
        setLoading(false);
        isFirstLoad.current = false;
      }
    };
    load();
    return () => { cancelled = true; };
  }, [city]);

  // Playable slots only (have a video)
  const playableIndices = slots
    .map((s, i) => (s.data.videoId ? i : -1))
    .filter((i) => i >= 0);

  const activeSlot = activeIndex !== null ? slots[activeIndex] : null;
  const activePosInPlayable = activeIndex !== null ? playableIndices.indexOf(activeIndex) : -1;
  const hasPrev = activePosInPlayable > 0;
  const hasNext = activePosInPlayable >= 0 && activePosInPlayable < playableIndices.length - 1;

  const goPrev = () => {
    if (!hasPrev) return;
    setActiveIndex(playableIndices[activePosInPlayable - 1]);
    setCurrentTime(0);
  };
  const goNext = () => {
    if (!hasNext) return;
    setActiveIndex(playableIndices[activePosInPlayable + 1]);
    setCurrentTime(0);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-lg">
        Aucune carte à afficher pour {city}.
      </div>
    );
  }

  const renderCard = (slot: MixedSlot, index: number) => {
    const it = slot.data;
    const isFileVideo = !!it.videoUrl && !it.thumbnail && !/youtube|youtu\.be|vimeo|mediadelivery/i.test(it.videoUrl);

    if (!it.videoId) {
      return (
        <div className="aspect-[9/16] rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground text-center px-2">
          {it.label || "Aucune vidéo"}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => { setCurrentTime(0); setActiveIndex(index); }}
        className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted group w-full text-left"
        aria-label={`Lire ${it.label || it.businessName || ""}`}
      >
        {it.thumbnail ? (
          <img src={it.thumbnail} alt={it.businessName || ""} className="w-full h-full object-cover" loading="lazy" />
        ) : isFileVideo && it.videoUrl ? (
          <VideoThumbnail src={it.videoUrl} alt={it.businessName || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
        {it.label && (
          <div className="absolute inset-x-0 top-[10%] z-[7] flex items-center justify-center px-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black">
              {it.label}
            </span>
          </div>
        )}
        {it.rating != null && (
          <div className="absolute top-1.5 left-1.5 right-1.5 z-[5] flex items-center gap-1 text-[10px]">
            <Star className="h-2.5 w-2.5 text-gold fill-gold" />
            <span className="font-medium text-white">{it.rating}/20</span>
            {(it.reviewCount ?? 0) > 0 && (
              <span className="text-white/70">· {it.reviewCount} avis</span>
            )}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/50 group-hover:bg-black/70 transition-colors flex items-center justify-center">
            <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-white ml-0.5" />
          </div>
        </div>
        {it.ownerLogo && (
          <div className="absolute inset-x-0 bottom-[15%] z-[6] flex items-center justify-center px-2 pointer-events-none">
            <img
              src={it.ownerLogo}
              alt={it.ownerName || ""}
              className="max-w-[100px] max-h-[72px] object-contain"
              style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))" }}
            />
          </div>
        )}
        {it.businessName && (
          <div className="absolute bottom-0 left-0 right-0 p-1.5">
            <p className="text-[10px] font-medium text-white line-clamp-1">{it.businessName}</p>
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <div className={`grid gap-4 ${activeSlot ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-6"}`}>
        {slots.map((slot, index) => (
          <div key={slot.key} className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-wider line-clamp-1 ${slot.kind === "extra" ? "text-primary" : "text-muted-foreground"}`}>
              {slot.data.label || "—"}
            </p>
            {renderCard(slot, index)}
          </div>
        ))}
      </div>

      <SlidePanelHome
        open={activeSlot !== null}
        onClose={() => setActiveIndex(null)}
        videoUrl={activeSlot?.data.videoUrl ?? null}
        videoId={activeSlot?.data.videoId ?? null}
        businessName={activeSlot?.data.businessName || activeSlot?.data.label || ""}
        isGeneric={false}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        onPrev={goPrev}
        onNext={goNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
        owner={
          activeSlot && activeSlot.data.ownerId
            ? { id: activeSlot.data.ownerId, name: activeSlot.data.ownerName || "", logo_url: activeSlot.data.ownerLogo }
            : null
        }
        social={null}
        description={null}
      />
    </>
  );
};

export default HomepageCardsFront;
