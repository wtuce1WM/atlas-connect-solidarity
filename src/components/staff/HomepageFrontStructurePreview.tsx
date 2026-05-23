import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, X, Loader2, Plus, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import VideoThumbnail from "@/components/VideoThumbnail";
import VideoLightbox from "@/components/staff/VideoLightbox";
import { invalidateManualCardCache } from "@/lib/manualCards";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  overrideBusinessId: string | null;
  isOverride: boolean;
}

interface ExtraCard {
  id: string;
  city: string;
  business_id: string | null;
  badge_id: string | null;
  video_document_id: string | null;
  title: string | null;
  sort_order: number;
  event_id: string | null;
  search_query: string | null;
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
  business_id: string | null;
  badge_id: string | null;
  badgeName: string | null;
  video_document_id: string | null;
  title: string | null;
  event_id: string | null;
  eventName: string | null;
  search_query: string | null;
}

interface BizLite { id: string; name: string }
interface BadgeLite { id: string; name_fr: string }
interface EventLite { id: string; name: string }

function deriveThumbnail(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

const HomepageFrontStructurePreview = ({ city }: Props) => {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [extraCards, setExtraCards] = useState<ExtraCardPreview[]>([]);
  const [mixedOrder, setMixedOrder] = useState<string[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeLite[]>([]);
  const [allEvents, setAllEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [allBusinesses, setAllBusinesses] = useState<BizLite[]>([]);
  const [searchByEntry, setSearchByEntry] = useState<Record<string, string>>({});
  const [openSearchEntry, setOpenSearchEntry] = useState<string | null>(null);
  const [entriesReloadKey, setEntriesReloadKey] = useState(0);
  const [extraReloadKey, setExtraReloadKey] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpenSearchEntry(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isFirstLoad.current) setLoading(true);

      // City row id
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

      // FS entries + badges + extra cards
      const [entriesRes, linksRes, overridesRes, badgesRes, extraRes, eventsRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order, show_in_menu").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        (supabase as any)
          .from("front_structure_homepage_overrides")
          .select("front_structure_id, business_id")
          .eq("city", city),
        supabase.from("badges").select("id, name_fr").order("name_fr"),
        (supabase as any)
          .from("front_structure_homepage_extra_cards")
          .select("id, city, business_id, badge_id, video_document_id, title, sort_order, event_id, search_query")
          .eq("city", city)
          .order("sort_order", { ascending: true }),
        supabase
          .from("events")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      const linksByEntry: Record<string, string[]> = {};
      (linksRes.data || []).forEach((l: any) => {
        (linksByEntry[l.front_structure_id] ||= []).push(l.subcategory_id);
      });

      const overrideByEntry: Record<string, string> = {};
      ((overridesRes as any).data || []).forEach((o: any) => {
        overrideByEntry[o.front_structure_id] = o.business_id;
      });

      const badges: BadgeLite[] = ((badgesRes.data as any[]) || []).map((b) => ({ id: b.id, name_fr: b.name_fr }));
      const badgeMap = new Map(badges.map((b) => [b.id, b]));

      const entries: FSEntry[] = (entriesRes.data || [])
        .filter((e: any) => e.show_in_menu !== false)
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          subcategory_ids: linksByEntry[e.id] || [],
        }))
        .filter((e: FSEntry) => e.subcategory_ids.length > 0);

      // Per entry: pick first video (own city or multi-city)
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
          // Source of truth: business_document_cities (resolved into extraDocIds).
          // Pick the first matching doc among those explicitly linked to this city.
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

      // ---- Extra cards: priority video_document_id > business+badge ----
      const extraRows: ExtraCard[] = ((extraRes as any).data || []).map((r: any) => ({
        id: r.id, city: r.city, business_id: r.business_id, badge_id: r.badge_id,
        video_document_id: r.video_document_id, title: r.title ?? null, sort_order: r.sort_order,
        event_id: r.event_id ?? null, search_query: r.search_query ?? null,
      }));
      const eventsList: EventLite[] = (((eventsRes as any).data) || []).map((e: any) => ({ id: e.id, name: e.name }));
      const eventMap = new Map(eventsList.map((e) => [e.id, e]));

      const extraDocByCard: Record<string, any> = {};
      for (const card of extraRows) {
        // 1) If a specific video is set, use it directly
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
            // Fallback: generic_videos
            const { data: gv } = await (supabase as any)
              .from("generic_videos")
              .select("id, url, thumbnail_url")
              .eq("id", card.video_document_id)
              .maybeSingle();
            if (gv) {
              extraDocByCard[card.id] = {
                id: (gv as any).id,
                url: (gv as any).url,
                thumbnail_url: (gv as any).thumbnail_url,
                business_id: card.business_id,
                poi_id: null,
                linked_business_id: null,
                sort_order: 0,
                __generic: true,
              };
            }
          }
          if (card.business_id) allBizIds.add(card.business_id);
          continue;
        }

        if (!card.business_id && !card.badge_id) continue;

        // Build candidate doc ids filtered by badge if needed
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
        if (badgeFilteredDocIds) {
          q = q.in("id", badgeFilteredDocIds.slice(0, 1000));
        }

        const { data: docs } = await q;
        const doc = (docs && docs[0]) || null;
        if (doc) {
          extraDocByCard[card.id] = doc;
          const dispId = doc.poi_id || doc.linked_business_id || doc.business_id;
          if (dispId) allBizIds.add(dispId);
          if (doc.business_id) allBizIds.add(doc.business_id);
        }
      }

      // Fetch businesses for display
      const bizMap = new Map<string, any>();
      const bizIdsArr = [...allBizIds];
      for (let i = 0; i < bizIdsArr.length; i += 300) {
        const chunk = bizIdsArr.slice(i, i + 300);
        const { data } = await supabase
          .from("businesses")
          .select("id, name, logo_url, computed_rating, rating, total_review_count, is_poi")
          .in("id", chunk);
        (data || []).forEach((b: any) => bizMap.set(b.id, b));
      }

      const previews: PreviewItem[] = entries.map((entry) => {
        const doc = firstDocByEntry[entry.id];
        const overrideBusinessId = overrideByEntry[entry.id] || null;
        if (!doc) {
          return {
            entryId: entry.id,
            entryName: entry.name,
            videoId: null,
            videoUrl: null,
            thumbnail: null,
            businessName: overrideBusinessId ? (bizMap.get(overrideBusinessId)?.name || null) : null,
            ownerLogo: null,
            ownerName: null,
            rating: null,
            reviewCount: null,
            overrideBusinessId,
            isOverride: !!overrideBusinessId,
          };
        }
        const ownerBiz = bizMap.get(doc.business_id) || null;
        const dispId = overrideBusinessId || doc.business_id;
        const dispBiz = bizMap.get(dispId) || null;

        return {
          entryId: entry.id,
          entryName: entry.name,
          videoId: doc.id,
          videoUrl: doc.url,
          thumbnail: doc.thumbnail_url || deriveThumbnail(doc.url),
          businessName: dispBiz?.name || null,
          ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
          ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
          rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
          reviewCount: dispBiz?.total_review_count ?? null,
          overrideBusinessId,
          isOverride: !!overrideBusinessId,
        };
      });

      const extraPreviews: ExtraCardPreview[] = extraRows.map((card) => {
        const doc = extraDocByCard[card.id];
        const badgeName = card.badge_id ? (badgeMap.get(card.badge_id)?.name_fr || null) : null;
        const eventName = card.event_id ? (eventMap.get(card.event_id)?.name || null) : null;
        if (!doc) {
          const biz = card.business_id ? bizMap.get(card.business_id) : null;
          return {
            cardId: card.id,
            videoId: null,
            videoUrl: null,
            thumbnail: null,
            businessName: biz?.name || null,
            ownerLogo: null,
            ownerName: null,
            rating: null,
            reviewCount: null,
            business_id: card.business_id,
            badge_id: card.badge_id,
            badgeName,
            video_document_id: card.video_document_id,
            title: card.title,
            event_id: card.event_id,
            eventName,
            search_query: card.search_query,
          };
        }
        const ownerBiz = bizMap.get(doc.business_id) || null;
        const dispId = card.business_id || doc.business_id;
        const dispBiz = bizMap.get(dispId) || null;
        return {
          cardId: card.id,
          videoId: doc.id,
          videoUrl: doc.url,
          thumbnail: doc.thumbnail_url || deriveThumbnail(doc.url),
          businessName: dispBiz?.name || null,
          ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
          ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
          rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
          reviewCount: dispBiz?.total_review_count ?? null,
          business_id: card.business_id,
          badge_id: card.badge_id,
          badgeName,
          video_document_id: card.video_document_id,
          title: card.title,
          event_id: card.event_id,
          eventName,
          search_query: card.search_query,
        };
      });

      // Load custom order for this city (mixes entries + extra cards)
      const { data: orderRows } = await (supabase as any)
        .from("front_structure_homepage_order")
        .select("item_type, item_id, sort_order")
        .eq("city", city)
        .order("sort_order", { ascending: true });

      const orderMap = new Map<string, number>();
      ((orderRows as any[]) || []).forEach((r) => {
        orderMap.set(`${r.item_type}:${r.item_id}`, r.sort_order);
      });

      const sortByCustom = <T extends { __key: string }>(arr: T[]): T[] => {
        return [...arr].sort((a, b) => {
          const oa = orderMap.has(a.__key) ? (orderMap.get(a.__key) as number) : Number.MAX_SAFE_INTEGER;
          const ob = orderMap.has(b.__key) ? (orderMap.get(b.__key) as number) : Number.MAX_SAFE_INTEGER;
          return oa - ob;
        });
      };

      const previewsKeyed = previews.map((p) => ({ ...p, __key: `entry:${p.entryId}` }));
      const extrasKeyed = extraPreviews.map((p) => ({ ...p, __key: `extra:${p.cardId}` }));

      // Build a single mixed ordered list
      const mixed: Array<{ kind: "entry" | "extra"; key: string; payload: any }> = [];
      const remaining = [
        ...previewsKeyed.map((p) => ({ kind: "entry" as const, key: p.__key, payload: p })),
        ...extrasKeyed.map((p) => ({ kind: "extra" as const, key: p.__key, payload: p })),
      ];
      // First: items present in orderMap, in order
      const ordered = [...remaining].filter((r) => orderMap.has(r.key));
      ordered.sort((a, b) => (orderMap.get(a.key)! - orderMap.get(b.key)!));
      mixed.push(...ordered);
      // Then: new items not yet ordered (preserve original order: entries first, extras after)
      remaining.filter((r) => !orderMap.has(r.key)).forEach((r) => mixed.push(r));

      if (!cancelled) {
        setItems(sortByCustom(previewsKeyed) as any);
        setExtraCards(sortByCustom(extrasKeyed) as any);
        setMixedOrder(mixed.map((m) => m.key));
        setAllBadges(badges);
        setAllEvents(eventsList);
        setLoading(false);
        isFirstLoad.current = false;
      }
    };
    load();
    return () => { cancelled = true; };
  }, [city, entriesReloadKey, extraReloadKey]);

  // Server-side search per query (debounced)
  const [searchResults, setSearchResults] = useState<Record<string, BizLite[]>>({});
  useEffect(() => {
    if (!openSearchEntry) return;
    const q = (searchByEntry[openSearchEntry] || "").trim();
    const entryId = openSearchEntry;
    const handle = setTimeout(async () => {
      let query = supabase.from("businesses").select("id, name").eq("is_active", true).order("name").limit(50);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query;
      const rows = ((data as any[]) || []).map((b) => ({ id: b.id, name: b.name }));
      setSearchResults((p) => ({ ...p, [entryId]: rows }));
      setAllBusinesses((prev) => {
        const map = new Map(prev.map((b) => [b.id, b]));
        rows.forEach((b) => map.set(b.id, b));
        return [...map.values()];
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [openSearchEntry, searchByEntry]);

  const setOverride = async (entryId: string, businessId: string | null) => {
    if (businessId) {
      const { error } = await (supabase as any)
        .from("front_structure_homepage_overrides")
        .upsert(
          { front_structure_id: entryId, city, business_id: businessId },
          { onConflict: "front_structure_id,city" }
        );
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await (supabase as any)
        .from("front_structure_homepage_overrides")
        .delete()
        .eq("front_structure_id", entryId)
        .eq("city", city);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    }
    setOpenSearchEntry(null);
    setSearchByEntry((p) => ({ ...p, [entryId]: "" }));
    setEntriesReloadKey((k) => k + 1);
  };

  const filteredFor = (entryId: string) => searchResults[entryId] || [];

  // Extra cards CRUD
  const addExtraCard = async () => {
    const nextSort = (extraCards.reduce((m, c) => Math.max(m, 0), 0)) + extraCards.length + 1;
    const { error } = await (supabase as any)
      .from("front_structure_homepage_extra_cards")
      .insert({ city, business_id: null, badge_id: null, sort_order: nextSort });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    invalidateManualCardCache(city as any);
    setExtraReloadKey((k) => k + 1);
  };

  const refreshExtraCard = async (cardId: string) => {
    const { data: row, error: rowError } = await (supabase as any)
      .from("front_structure_homepage_extra_cards")
      .select("id, city, business_id, badge_id, video_document_id, title, sort_order, popular_search_id, event_id")
      .eq("id", cardId)
      .maybeSingle();

    if (rowError || !row) return;

    const card: ExtraCard = {
      id: row.id,
      city: row.city,
      business_id: row.business_id,
      badge_id: row.badge_id,
      video_document_id: row.video_document_id,
      title: row.title ?? null,
      sort_order: row.sort_order,
      event_id: row.event_id ?? null,
    };

    const badgeName = card.badge_id
      ? (allBadges.find((badge) => badge.id === card.badge_id)?.name_fr || null)
      : null;
    const eventName = card.event_id
      ? (allEvents.find((e) => e.id === card.event_id)?.name || null)
      : null;

    let doc: any = null;
    let badgeFilteredDocIds: string[] | null = null;

    if (card.video_document_id) {
      const [{ data: vDoc }, { data: gv }] = await Promise.all([
        supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
          .eq("id", card.video_document_id)
          .maybeSingle(),
        (supabase as any)
          .from("generic_videos")
          .select("id, url, thumbnail_url")
          .eq("id", card.video_document_id)
          .maybeSingle(),
      ]);

      if (vDoc) {
        doc = vDoc;
      } else if (gv) {
        doc = {
          id: gv.id,
          url: gv.url,
          thumbnail_url: gv.thumbnail_url,
          business_id: card.business_id,
          poi_id: null,
          linked_business_id: null,
          sort_order: 0,
          __generic: true,
        };
      }
    } else if (card.business_id || card.badge_id) {
      if (card.badge_id) {
        const { data: badgeDocs } = await supabase
          .from("business_document_badges")
          .select("document_id")
          .eq("badge_id", card.badge_id);
        badgeFilteredDocIds = ((badgeDocs as any[]) || []).map((r) => r.document_id);
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
      if (badgeFilteredDocIds) {
        if (badgeFilteredDocIds.length === 0) {
          doc = null;
        } else {
          q = q.in("id", badgeFilteredDocIds.slice(0, 1000));
        }
      }

      if (doc === null && (!badgeFilteredDocIds || badgeFilteredDocIds.length > 0)) {
        const { data: docs } = await q;
        doc = (docs && docs[0]) || null;
      }
    }

    const businessIds = new Set<string>();
    if (card.business_id) businessIds.add(card.business_id);
    if (doc?.business_id) businessIds.add(doc.business_id);
    const displayBusinessId = card.business_id || doc?.business_id || null;
    if (displayBusinessId) businessIds.add(displayBusinessId);
    const ownerBusinessId = doc?.poi_id || doc?.linked_business_id || doc?.business_id || null;
    if (ownerBusinessId) businessIds.add(ownerBusinessId);

    const bizMap = new Map<string, any>();
    const ids = [...businessIds];
    if (ids.length > 0) {
      const { data: bizRows } = await supabase
        .from("businesses")
        .select("id, name, logo_url, computed_rating, rating, total_review_count")
        .in("id", ids);
      (bizRows || []).forEach((biz: any) => bizMap.set(biz.id, biz));
      setAllBusinesses((prev) => {
        const merged = new Map(prev.map((biz) => [biz.id, biz]));
        (bizRows || []).forEach((biz: any) => merged.set(biz.id, { id: biz.id, name: biz.name }));
        return [...merged.values()];
      });
    }

    const ownerBiz = doc?.business_id ? (bizMap.get(doc.business_id) || null) : null;
    const dispBiz = displayBusinessId ? (bizMap.get(displayBusinessId) || null) : null;

    setExtraCards((prev) => prev.map((existing) => existing.cardId !== cardId ? existing : {
      ...existing,
      cardId: card.id,
      videoId: doc?.id || null,
      videoUrl: doc?.url || null,
      thumbnail: doc ? (doc.thumbnail_url || deriveThumbnail(doc.url)) : null,
      businessName: dispBiz?.name || null,
      ownerLogo: ownerBiz && ownerBiz.id !== displayBusinessId ? ownerBiz.logo_url : null,
      ownerName: ownerBiz && ownerBiz.id !== displayBusinessId ? ownerBiz.name : null,
      rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
      reviewCount: dispBiz?.total_review_count ?? null,
      business_id: card.business_id,
      badge_id: card.badge_id,
      badgeName,
      video_document_id: card.video_document_id,
      title: card.title,
      event_id: card.event_id,
      eventName,
    }));
  };

  const updateExtraCard = async (cardId: string, patch: { business_id?: string | null; badge_id?: string | null; video_document_id?: string | null; title?: string | null; event_id?: string | null }) => {
      if (patch.video_document_id !== undefined && patch.video_document_id !== null) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(patch.video_document_id)) {
          toast({ title: "ID invalide", description: "L'ID vidéo doit être un UUID valide.", variant: "destructive" });
          return;
        }
        const [{ data: bd }, { data: gv }] = await Promise.all([
          supabase.from("business_documents").select("id").eq("id", patch.video_document_id).maybeSingle(),
          (supabase as any).from("generic_videos").select("id").eq("id", patch.video_document_id).maybeSingle(),
        ]);
        if (!bd && !gv) {
          toast({ title: "Vidéo introuvable", description: "Aucune vidéo avec cet ID (ni business_documents, ni generic_videos).", variant: "destructive" });
          return;
        }
      }
    const { error } = await (supabase as any)
      .from("front_structure_homepage_extra_cards")
      .update(patch)
      .eq("id", cardId);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    invalidateManualCardCache(city as any);
    setOpenSearchEntry(null);
    setSearchByEntry((p) => ({ ...p, [cardId]: "" }));
    setExtraCards((prev) => prev.map((card) => {
      if (card.cardId !== cardId) return card;
      const nextBusinessId = patch.business_id !== undefined ? patch.business_id : card.business_id;
      const nextBadgeId = patch.badge_id !== undefined ? patch.badge_id : card.badge_id;
      const nextVideoDocumentId = patch.video_document_id !== undefined ? patch.video_document_id : card.video_document_id;
      const nextTitle = patch.title !== undefined ? patch.title : card.title;
      const nextEventId = patch.event_id !== undefined ? patch.event_id : card.event_id;
      const nextBusiness = nextBusinessId ? allBusinesses.find((b) => b.id === nextBusinessId) : null;
      const nextEvent = nextEventId ? allEvents.find((e) => e.id === nextEventId) : null;

      return {
        ...card,
        business_id: nextBusinessId,
        badge_id: nextBadgeId,
        badgeName: nextBadgeId ? (allBadges.find((b) => b.id === nextBadgeId)?.name_fr || null) : null,
        video_document_id: nextVideoDocumentId,
        title: nextTitle,
        event_id: nextEventId,
        eventName: nextEvent?.name || (patch.event_id !== undefined ? null : card.eventName),
        businessName: nextBusiness?.name || (patch.business_id !== undefined ? null : card.businessName),
      };
    }));
    await refreshExtraCard(cardId);
  };

  const deleteExtraCard = async (cardId: string) => {
    const { error } = await (supabase as any)
      .from("front_structure_homepage_extra_cards")
      .delete()
      .eq("id", cardId);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    invalidateManualCardCache(city as any);
    setExtraReloadKey((k) => k + 1);
  };

  // Drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistOrder = async (newOrder: string[]) => {
    const rows = newOrder.map((key, idx) => {
      const [item_type, item_id] = key.split(":");
      return { city, item_type, item_id, sort_order: idx };
    });
    const { error: delErr } = await (supabase as any)
      .from("front_structure_homepage_order")
      .delete()
      .eq("city", city);
    if (delErr) { toast({ title: "Erreur", description: delErr.message, variant: "destructive" }); return; }
    if (rows.length > 0) {
      const { error: insErr } = await (supabase as any)
        .from("front_structure_homepage_order")
        .insert(rows);
      if (insErr) { toast({ title: "Erreur", description: insErr.message, variant: "destructive" }); return; }
    }
    invalidateManualCardCache(city as any);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = mixedOrder.indexOf(active.id as string);
    const newIndex = mixedOrder.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(mixedOrder, oldIndex, newIndex);
    setMixedOrder(next);
    void persistOrder(next);
  };

  const itemsById = useMemo(() => {
    const m = new Map<string, { kind: "entry" | "extra"; data: any }>();
    items.forEach((it) => m.set(`entry:${it.entryId}`, { kind: "entry", data: it }));
    extraCards.forEach((c) => m.set(`extra:${c.cardId}`, { kind: "extra", data: c }));
    return m;
  }, [items, extraCards]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0 && extraCards.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-lg">
          Aucune entrée Structure du Front visible.
        </div>
        <div className="flex justify-center">
          <Button size="sm" variant="outline" onClick={addExtraCard}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une carte
          </Button>
        </div>
      </div>
    );
  }

  const renderThumbBox = (it: {
    thumbnail: string | null;
    videoUrl?: string | null;
    businessName: string | null;
    rating: number | null;
    reviewCount: number | null;
    ownerLogo: string | null;
    ownerName: string | null;
    videoId: string | null;
    fallbackLabel?: string;
    badgeLabel?: string | null;
  }) => {
    const isFileVideo = !!it.videoUrl && !it.thumbnail && !/youtube|youtu\.be|vimeo|mediadelivery/i.test(it.videoUrl);
    return it.videoId ? (
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
        {it.thumbnail ? (
          <img src={it.thumbnail} alt={it.businessName || ""} className="w-full h-full object-cover" loading="lazy" />
        ) : isFileVideo && it.videoUrl ? (
          <VideoThumbnail src={it.videoUrl} alt={it.businessName || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
        {it.badgeLabel && (
          <div className="absolute inset-x-0 top-[10%] z-[7] flex items-center justify-center px-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black">
              {it.badgeLabel}
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
          disabled={!it.videoUrl}
          className="absolute inset-0 flex items-center justify-center group/play disabled:cursor-not-allowed"
          aria-label="Lire la vidéo"
        >
          <div className="w-8 h-8 rounded-full bg-black/50 group-hover/play:bg-black/70 transition-colors flex items-center justify-center">
            <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
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
    ) : (
      <div className="aspect-[9/16] rounded-lg bg-muted flex items-center justify-center text-[10px] text-muted-foreground text-center px-2">
        {it.fallbackLabel || "Aucune vidéo"}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={mixedOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mixedOrder.map((key) => {
              const slot = itemsById.get(key);
              if (!slot) return null;
              if (slot.kind === "entry") {
                const it = slot.data as PreviewItem;
                return (
                  <SortableCell key={key} id={key}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1">
                      {it.entryName}
                    </p>
                    {renderThumbBox({ ...it, badgeLabel: it.entryName })}
                    <div className="relative">
                      <label className="text-[9px] text-muted-foreground">
                        Établissement {it.isOverride && <span className="text-primary">(forcé)</span>}
                      </label>
                      {it.overrideBusinessId ? (
                        <div className="flex items-center gap-0.5 h-5 px-1 border rounded-md bg-background">
                          <span className="text-[9px] truncate flex-1">
                            {allBusinesses.find((b) => b.id === it.overrideBusinessId)?.name || it.businessName || "…"}
                          </span>
                          <button type="button" className="shrink-0" onClick={() => setOverride(it.entryId, null)} title="Retirer l'override">
                            <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Input
                            value={searchByEntry[it.entryId] || ""}
                            onChange={(e) => setSearchByEntry((p) => ({ ...p, [it.entryId]: e.target.value }))}
                            onFocus={() => setOpenSearchEntry(it.entryId)}
                            placeholder="Rechercher…"
                            className="h-5 px-1 text-[9px]"
                          />
                          {openSearchEntry === it.entryId && (
                            <div className="absolute z-20 left-0 right-0 mt-0.5 max-h-48 overflow-auto border rounded-md bg-popover shadow-md">
                              {filteredFor(it.entryId).length === 0 ? (
                                <div className="px-1.5 py-1 text-[9px] text-muted-foreground">Aucun résultat</div>
                              ) : (
                                filteredFor(it.entryId).map((b) => (
                                  <button key={b.id} type="button" className="w-full text-left px-1.5 py-0.5 text-[9px] hover:bg-accent truncate" onClick={() => setOverride(it.entryId, b.id)}>
                                    {b.name}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </SortableCell>
                );
              }
              const card = slot.data as ExtraCardPreview;
              return (
                <SortableCell key={key} id={key}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary line-clamp-1">
                      {card.title?.trim() || card.eventName || "Carte libre"}
                    </p>
                    <button type="button" onClick={() => deleteExtraCard(card.cardId)} title="Supprimer cette carte">
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  {renderThumbBox({ ...card, videoId: card.videoId, fallbackLabel: "Choisir établissement / événement / badge", badgeLabel: card.title?.trim() || card.eventName || null })}
                  <div>
                    <label className="text-[9px] text-muted-foreground">Titre</label>
                    <Input
                      key={`title-${card.cardId}-${card.title || ""}`}
                      defaultValue={card.title || ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (card.title || "")) updateExtraCard(card.cardId, { title: v || null });
                      }}
                      placeholder="Titre de la carte…"
                      className="h-5 px-1 text-[9px]"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[9px] text-muted-foreground">Établissement</label>
                    {card.business_id ? (
                      <div className="flex items-center gap-0.5 h-5 px-1 border rounded-md bg-background">
                        <span className="text-[9px] truncate flex-1">
                          {allBusinesses.find((b) => b.id === card.business_id)?.name || card.businessName || "…"}
                        </span>
                        <button type="button" className="shrink-0" onClick={() => updateExtraCard(card.cardId, { business_id: null })} title="Retirer">
                          <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Input
                          value={searchByEntry[card.cardId] || ""}
                          onChange={(e) => setSearchByEntry((p) => ({ ...p, [card.cardId]: e.target.value }))}
                          onFocus={() => setOpenSearchEntry(card.cardId)}
                          placeholder="Rechercher…"
                          className="h-5 px-1 text-[9px]"
                        />
                        {openSearchEntry === card.cardId && (
                          <div className="absolute z-20 left-0 right-0 mt-0.5 max-h-48 overflow-auto border rounded-md bg-popover shadow-md">
                            {filteredFor(card.cardId).length === 0 ? (
                              <div className="px-1.5 py-1 text-[9px] text-muted-foreground">Aucun résultat</div>
                            ) : (
                              filteredFor(card.cardId).map((b) => (
                                <button key={b.id} type="button" className="w-full text-left px-1.5 py-0.5 text-[9px] hover:bg-accent truncate" onClick={() => updateExtraCard(card.cardId, { business_id: b.id })}>
                                  {b.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">
                      Événement {card.event_id && <span className="text-primary">(lié)</span>}
                    </label>
                    <div className="flex items-center gap-0.5">
                      <select
                        value={card.event_id || ""}
                        onChange={(e) => updateExtraCard(card.cardId, { event_id: e.target.value || null })}
                        className="h-5 w-full px-1 text-[9px] border rounded-md bg-background"
                      >
                        <option value="">— Aucun —</option>
                        {allEvents.map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.name}</option>
                        ))}
                      </select>
                      {card.event_id && (
                        <button type="button" className="shrink-0" onClick={() => updateExtraCard(card.cardId, { event_id: null })} title="Retirer">
                          <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Badge</label>
                    <select
                      value={card.badge_id || ""}
                      onChange={(e) => updateExtraCard(card.cardId, { badge_id: e.target.value || null })}
                      className="h-5 w-full px-1 text-[9px] border rounded-md bg-background"
                    >
                      <option value="">— Aucun —</option>
                      {allBadges.map((b) => (
                        <option key={b.id} value={b.id}>{b.name_fr}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">
                      ID vidéo {card.video_document_id && <span className="text-primary">(prioritaire)</span>}
                    </label>
                    <div className="flex items-center gap-0.5">
                      <Input
                        key={`vid-${card.cardId}-${card.video_document_id || ""}`}
                        defaultValue={card.video_document_id || ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (card.video_document_id || "")) updateExtraCard(card.cardId, { video_document_id: v || null });
                        }}
                        placeholder="UUID vidéo…"
                        className="h-5 px-1 text-[9px] font-mono"
                      />
                      {card.video_document_id && (
                        <button type="button" className="shrink-0" onClick={() => updateExtraCard(card.cardId, { video_document_id: null })} title="Retirer">
                          <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                </SortableCell>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex justify-center">
        <Button size="sm" variant="outline" onClick={addExtraCard}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une carte
        </Button>
      </div>
      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

const SortableCell = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative space-y-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute -top-1 -left-1 z-30 h-6 w-6 rounded-md bg-background/90 border shadow flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-accent"
        title="Glisser pour réordonner"
        aria-label="Poignée de tri"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
};

export default HomepageFrontStructurePreview;
