import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";
import VideoLightbox from "@/components/staff/VideoLightbox";

interface Props {
  city: string;
}

interface FSEntry {
  id: string;
  name: string;
  subcategory_ids: string[];
}

interface PreviewItem {
  entryId: string;
  entryName: string;
  videoId: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  businessName: string | null;
  ownerLogo: string | null;
  ownerName: string | null;
  rating: number | null;
  reviewCount: number | null;
}

interface ExtraCardPreview {
  cardId: string;
  videoId: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  businessName: string | null;
  ownerLogo: string | null;
  ownerName: string | null;
  rating: number | null;
  reviewCount: number | null;
  title: string | null;
  badgeName: string | null;
}

function deriveThumbnail(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

interface MixedSlot {
  key: string;
  kind: "entry" | "extra";
  data: PreviewItem | ExtraCardPreview;
}

const HomepageCardsFront = ({ city }: Props) => {
  const [slots, setSlots] = useState<MixedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isFirstLoad.current) setLoading(true);

      // City row id (multi-city assignments)
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .eq("name_fr", city)
        .maybeSingle();
      const cityRowId = (cityRow as any)?.id || null;

      let extraDocIds = new Set<string>();
      if (cityRowId) {
        const { data } = await supabase
          .from("business_document_cities")
          .select("document_id")
          .eq("city_id", cityRowId);
        extraDocIds = new Set(((data as any[]) || []).map((r) => r.document_id));
      }

      const [entriesRes, linksRes, overridesRes, badgesRes, extraRes] = await Promise.all([
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
      ]);

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

      // Pick first video per entry (override > own city > multi-city)
      const firstDocByEntry: Record<string, any> = {};
      const allBizIds = new Set<string>();

      for (const entry of entries) {
        const overrideBizId = overrideByEntry[entry.id];
        let candidate: any = null;

        if (overrideBizId) {
          const { data: ovDocs } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
            .eq("type", "video")
            .or(`business_id.eq.${overrideBizId},linked_business_id.eq.${overrideBizId},poi_id.eq.${overrideBizId}`)
            .in("subcategory_id", entry.subcategory_ids)
            .order("sort_order", { ascending: true })
            .limit(1);
          candidate = (ovDocs && ovDocs[0]) || null;
          if (!candidate) {
            const { data: anyDocs } = await supabase
              .from("business_documents")
              .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
              .eq("type", "video")
              .or(`business_id.eq.${overrideBizId},linked_business_id.eq.${overrideBizId},poi_id.eq.${overrideBizId}`)
              .order("sort_order", { ascending: true })
              .limit(1);
            candidate = (anyDocs && anyDocs[0]) || null;
          }
          allBizIds.add(overrideBizId);
        } else {
          const { data: ownDocs } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
            .eq("type", "video")
            .eq("city", city)
            .in("subcategory_id", entry.subcategory_ids)
            .order("sort_order", { ascending: true })
            .limit(1);
          candidate = (ownDocs && ownDocs[0]) || null;

          if (extraDocIds.size > 0) {
            const ids = [...extraDocIds];
            for (let i = 0; i < ids.length; i += 300) {
              const chunk = ids.slice(i, i + 300);
              const { data: extras } = await supabase
                .from("business_documents")
                .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
                .eq("type", "video")
                .in("subcategory_id", entry.subcategory_ids)
                .in("id", chunk)
                .order("sort_order", { ascending: true })
                .limit(1);
              const e = (extras && extras[0]) || null;
              if (e && (!candidate || (e.sort_order ?? 0) < (candidate.sort_order ?? 0))) {
                candidate = e;
              }
            }
          }
        }

        if (candidate) {
          firstDocByEntry[entry.id] = candidate;
          const dispId = candidate.poi_id || candidate.linked_business_id || candidate.business_id;
          if (dispId) allBizIds.add(dispId);
          if (candidate.business_id) allBizIds.add(candidate.business_id);
        }
      }

      // Extra cards
      const extraRows: any[] = ((extraRes as any).data || []);
      const extraDocByCard: Record<string, any> = {};
      for (const card of extraRows) {
        if (card.video_document_id) {
          const { data: vDoc } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
            .eq("id", card.video_document_id)
            .maybeSingle();
          if (vDoc) {
            extraDocByCard[card.id] = vDoc;
            const dispId = (vDoc as any).poi_id || (vDoc as any).linked_business_id || (vDoc as any).business_id;
            if (dispId) allBizIds.add(dispId);
            if ((vDoc as any).business_id) allBizIds.add((vDoc as any).business_id);
          } else {
            const { data: gv } = await (supabase as any)
              .from("generic_videos")
              .select("id, url, thumbnail_url")
              .eq("id", card.video_document_id)
              .maybeSingle();
            if (gv) {
              extraDocByCard[card.id] = {
                id: gv.id, url: gv.url, thumbnail_url: gv.thumbnail_url,
                business_id: card.business_id, poi_id: null, linked_business_id: null, sort_order: 0,
              };
            }
          }
          if (card.business_id) allBizIds.add(card.business_id);
          continue;
        }

        if (!card.business_id && !card.badge_id) continue;

        let badgeFilteredDocIds: string[] | null = null;
        if (card.badge_id) {
          const { data: badgeDocs } = await supabase
            .from("business_document_badges")
            .select("document_id")
            .eq("badge_id", card.badge_id);
          badgeFilteredDocIds = ((badgeDocs as any[]) || []).map((r) => r.document_id);
          if (badgeFilteredDocIds.length === 0) continue;
        }

        let q = supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
          .eq("type", "video")
          .order("sort_order", { ascending: true })
          .limit(1);
        if (card.business_id) {
          q = q.or(`business_id.eq.${card.business_id},linked_business_id.eq.${card.business_id},poi_id.eq.${card.business_id}`);
          allBizIds.add(card.business_id);
        }
        if (badgeFilteredDocIds) q = q.in("id", badgeFilteredDocIds.slice(0, 1000));
        const { data: docs } = await q;
        const doc = (docs && docs[0]) || null;
        if (doc) {
          extraDocByCard[card.id] = doc;
          const dispId = doc.poi_id || doc.linked_business_id || doc.business_id;
          if (dispId) allBizIds.add(dispId);
          if (doc.business_id) allBizIds.add(doc.business_id);
        }
      }

      // Fetch businesses
      const bizMap = new Map<string, any>();
      const bizIdsArr = [...allBizIds];
      for (let i = 0; i < bizIdsArr.length; i += 300) {
        const chunk = bizIdsArr.slice(i, i + 300);
        const { data } = await supabase
          .from("businesses")
          .select("id, name, logo_url, computed_rating, rating, total_review_count")
          .in("id", chunk);
        (data || []).forEach((b: any) => bizMap.set(b.id, b));
      }

      const previews: PreviewItem[] = entries.map((entry) => {
        const doc = firstDocByEntry[entry.id];
        const overrideBusinessId = overrideByEntry[entry.id] || null;
        if (!doc) {
          return {
            entryId: entry.id, entryName: entry.name,
            videoId: null, videoUrl: null, thumbnail: null,
            businessName: overrideBusinessId ? (bizMap.get(overrideBusinessId)?.name || null) : null,
            ownerLogo: null, ownerName: null, rating: null, reviewCount: null,
          };
        }
        const ownerBiz = bizMap.get(doc.business_id) || null;
        const dispId = overrideBusinessId || doc.business_id;
        const dispBiz = bizMap.get(dispId) || null;
        return {
          entryId: entry.id, entryName: entry.name,
          videoId: doc.id, videoUrl: doc.url,
          thumbnail: doc.thumbnail_url || deriveThumbnail(doc.url),
          businessName: dispBiz?.name || null,
          ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
          ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
          rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
          reviewCount: dispBiz?.total_review_count ?? null,
        };
      });

      const extraPreviews: ExtraCardPreview[] = extraRows.map((card) => {
        const doc = extraDocByCard[card.id];
        const badgeName = card.badge_id ? (badgeMap.get(card.badge_id) || null) : null;
        if (!doc) {
          const biz = card.business_id ? bizMap.get(card.business_id) : null;
          return {
            cardId: card.id,
            videoId: null, videoUrl: null, thumbnail: null,
            businessName: biz?.name || null, ownerLogo: null, ownerName: null,
            rating: null, reviewCount: null,
            title: card.title ?? null, badgeName,
          };
        }
        const ownerBiz = bizMap.get(doc.business_id) || null;
        const dispId = card.business_id || doc.business_id;
        const dispBiz = bizMap.get(dispId) || null;
        return {
          cardId: card.id,
          videoId: doc.id, videoUrl: doc.url,
          thumbnail: doc.thumbnail_url || deriveThumbnail(doc.url),
          businessName: dispBiz?.name || null,
          ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
          ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
          rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
          reviewCount: dispBiz?.total_review_count ?? null,
          title: card.title ?? null, badgeName,
        };
      });

      // Custom order
      const { data: orderRows } = await (supabase as any)
        .from("front_structure_homepage_order")
        .select("item_type, item_id, sort_order")
        .eq("city", city)
        .order("sort_order", { ascending: true });

      const orderMap = new Map<string, number>();
      ((orderRows as any[]) || []).forEach((r) => {
        orderMap.set(`${r.item_type}:${r.item_id}`, r.sort_order);
      });

      const all: MixedSlot[] = [
        ...previews.map((p): MixedSlot => ({ key: `entry:${p.entryId}`, kind: "entry", data: p })),
        ...extraPreviews.map((p): MixedSlot => ({ key: `extra:${p.cardId}`, kind: "extra", data: p })),
      ];

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

  const renderCard = (slot: MixedSlot) => {
    const isEntry = slot.kind === "entry";
    const it = slot.data as PreviewItem & ExtraCardPreview;
    const label = isEntry
      ? (slot.data as PreviewItem).entryName
      : ((slot.data as ExtraCardPreview).title?.trim() || (slot.data as ExtraCardPreview).badgeName || null);
    const isFileVideo = !!it.videoUrl && !it.thumbnail && !/youtube|youtu\.be|vimeo|mediadelivery/i.test(it.videoUrl);

    if (!it.videoId) {
      return (
        <div className="aspect-[9/16] rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground text-center px-2">
          {label || "Aucune vidéo"}
        </div>
      );
    }

    return (
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted group">
        {it.thumbnail ? (
          <img src={it.thumbnail} alt={it.businessName || ""} className="w-full h-full object-cover" loading="lazy" />
        ) : isFileVideo && it.videoUrl ? (
          <VideoThumbnail src={it.videoUrl} alt={it.businessName || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
        {label && (
          <div className="absolute inset-x-0 top-[10%] z-[7] flex items-center justify-center px-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black">
              {label}
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (it.videoUrl) setLightboxUrl(it.videoUrl);
          }}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Lire la vidéo"
        >
          <div className="w-10 h-10 rounded-full bg-black/50 group-hover:bg-black/70 transition-colors flex items-center justify-center">
            <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-white ml-0.5" />
          </div>
        </button>
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
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {slots.map((slot) => (
          <div key={slot.key}>{renderCard(slot)}</div>
        ))}
      </div>
      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </>
  );
};

export default HomepageCardsFront;
