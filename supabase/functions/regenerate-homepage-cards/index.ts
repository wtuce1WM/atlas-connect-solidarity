import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function deriveThumbnail(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

const CITY_ALIASES: Record<string, string[]> = {
  Marrakech: ["Marrakech", "Agafay"],
  Essaouira: ["Essaouira"],
};
const getCityAliases = (c: string): string[] => CITY_ALIASES[c] || [c];

async function buildSnapshot(supabase: any, city: string) {
  const aliasNames = getCityAliases(city);
  const [cityRowsRes, entriesRes, linksRes, overridesRes, badgesRes, extraRes, orderRes, subcatRes] = await Promise.all([
    supabase.from("cities").select("id").in("name_fr", aliasNames),
    supabase.from("front_structure").select("id, name, sort_order, show_in_menu").order("sort_order"),
    supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
    supabase.from("front_structure_homepage_overrides").select("front_structure_id, business_id, image_url").eq("city", city),
    supabase.from("badges").select("id, name_fr"),
    supabase
      .from("front_structure_homepage_extra_cards")
      .select("id, city, business_id, badge_id, video_document_id, title, sort_order, event_id, image_url")
      .eq("city", city)
      .order("sort_order", { ascending: true }),
    supabase
      .from("front_structure_homepage_order")
      .select("item_type, item_id, sort_order")
      .eq("city", city)
      .order("sort_order", { ascending: true }),
    supabase.from("subcategories").select("id, name_fr"),
  ]);
  const subcatNameById = new Map<string, string>(
    ((subcatRes.data as any[]) || []).map((s) => [s.id, s.name_fr])
  );

  const aliasCityIds = ((cityRowsRes.data as any[]) || []).map((r) => r.id);
  const cityRowId = aliasCityIds[0] || null;
  const linkedDocIdsRes = aliasCityIds.length > 0
    ? await supabase.from("business_document_cities").select("document_id").in("city_id", aliasCityIds)
    : { data: [] as any[] };
  const linkedDocIds = new Set(((linkedDocIdsRes.data as any[]) || []).map((r) => r.document_id));


  const linksByEntry: Record<string, string[]> = {};
  (linksRes.data || []).forEach((l: any) => {
    (linksByEntry[l.front_structure_id] ||= []).push(l.subcategory_id);
  });

  const overrideByEntry: Record<string, string> = {};
  const overrideImageByEntry: Record<string, string | null> = {};
  (overridesRes.data || []).forEach((o: any) => {
    if (o.business_id) overrideByEntry[o.front_structure_id] = o.business_id;
    if (o.image_url) overrideImageByEntry[o.front_structure_id] = o.image_url;
  });

  const badgeMap = new Map<string, string>(
    ((badgesRes.data as any[]) || []).map((b) => [b.id, b.name_fr])
  );

  const entries = (entriesRes.data || [])
    .filter((e: any) => e.show_in_menu !== false)
    .map((e: any) => ({ id: e.id, name: e.name, subcategory_ids: linksByEntry[e.id] || [] }))
    .filter((e: any) => e.subcategory_ids.length > 0);

  const extraRows: any[] = (extraRes.data || []);

  const entryDocPromises = entries.map(async (entry: any) => {
    const overrideBizId = overrideByEntry[entry.id];
    if (overrideBizId) {
      const orFilter = `business_id.eq.${overrideBizId},linked_business_id.eq.${overrideBizId},poi_id.eq.${overrideBizId}`;
      const { data: ovDocs } = await supabase
        .from("business_documents")
        .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
        .eq("type", "video").eq("business_is_active", true).or(orFilter)
        .in("subcategory_id", entry.subcategory_ids)
        .order("sort_order", { ascending: true }).limit(1);
      let candidate: any = (ovDocs && ovDocs[0]) || null;
      if (!candidate) {
        const { data: anyDocs } = await supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
          .eq("type", "video").eq("business_is_active", true).or(orFilter)
          .order("sort_order", { ascending: true }).limit(1);
        candidate = (anyDocs && anyDocs[0]) || null;
      }
      return { entryId: entry.id, candidate };
    }

    // Source of truth: business_document_cities. A video appears on a city's homepage
    // only if it is explicitly linked to that city via business_document_cities.
    if (linkedDocIds.size === 0) {
      return { entryId: entry.id, candidate: null };
    }

    const ids = [...linkedDocIds];
    const queries: Promise<any>[] = [];
    for (let i = 0; i < ids.length; i += 300) {
      const chunk = ids.slice(i, i + 300);
      queries.push(
        supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
          .eq("type", "video")
          .eq("business_is_active", true)
          .in("subcategory_id", entry.subcategory_ids)
          .in("id", chunk)
          .order("sort_order", { ascending: true }).limit(1)
      );
    }

    const results = await Promise.all(queries);
    let candidate: any = null;
    for (const r of results) {
      const e = (r.data && r.data[0]) || null;
      if (e && (!candidate || (e.sort_order ?? 0) < (candidate.sort_order ?? 0))) candidate = e;
    }
    return { entryId: entry.id, candidate };
  });

  const extraCardPromises = extraRows.map(async (card) => {
    if (card.video_document_id) {
      const { data: vDoc } = await supabase
        .from("business_documents")
        .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
        .eq("id", card.video_document_id).eq("business_is_active", true).maybeSingle();
      if (vDoc) return { cardId: card.id, doc: vDoc };
      const { data: gv } = await supabase
        .from("generic_videos")
        .select("id, url, thumbnail_url")
        .eq("id", card.video_document_id).maybeSingle();
      if (gv) {
        return {
          cardId: card.id,
          doc: { id: gv.id, url: gv.url, thumbnail_url: gv.thumbnail_url, business_id: card.business_id, poi_id: null, linked_business_id: null, sort_order: 0 },
        };
      }
      return { cardId: card.id, doc: null };
    }

    if (!card.business_id && !card.badge_id) return { cardId: card.id, doc: null };

    let badgeFilteredDocIds: string[] | null = null;
    if (card.badge_id) {
      const { data: badgeDocs } = await supabase
        .from("business_document_badges").select("document_id").eq("badge_id", card.badge_id);
      badgeFilteredDocIds = ((badgeDocs as any[]) || []).map((r) => r.document_id);
      if (badgeFilteredDocIds.length === 0) return { cardId: card.id, doc: null };
    }

    let q = supabase
      .from("business_documents")
      .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
      .eq("type", "video").eq("business_is_active", true).order("sort_order", { ascending: true }).limit(1);
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
  const allDocIdsForImmo = new Set<string>();
  for (const { entryId, candidate } of entryDocResults) {
    if (candidate) {
      firstDocByEntry[entryId] = candidate;
      const dispId = candidate.poi_id || candidate.linked_business_id || candidate.business_id;
      if (dispId) allBizIds.add(dispId);
      if (candidate.business_id) allBizIds.add(candidate.business_id);
      if (candidate.id) allDocIdsForImmo.add(candidate.id);
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
      if (doc.id) allDocIdsForImmo.add(doc.id);
    }
  }
  for (const card of extraRows) if (card.business_id) allBizIds.add(card.business_id);

  const bizMap = new Map<string, any>();
  const bizIdsArr = [...allBizIds];
  const bizChunks: Promise<any>[] = [];
  for (let i = 0; i < bizIdsArr.length; i += 300) {
    bizChunks.push(
      supabase
        .from("businesses")
        .select("id, name, logo_url, computed_rating, rating, total_review_count")
        .in("id", bizIdsArr.slice(i, i + 300))
    );
  }
  const bizResults = await Promise.all(bizChunks);
  bizResults.forEach((r) => (r.data || []).forEach((b: any) => bizMap.set(b.id, b)));

  // Fetch event details (for cards with event_id) and immo prices (for video docs)
  const eventIdsAll = [...new Set(extraRows.map((c: any) => c.event_id).filter(Boolean))] as string[];
  const docIdsArr = [...allDocIdsForImmo];
  const [eventsRes, immoRes] = await Promise.all([
    eventIdsAll.length > 0
      ? supabase.from("events").select("id, name, images").in("id", eventIdsAll)
      : Promise.resolve({ data: [] as any[] }),
    docIdsArr.length > 0
      ? supabase.from("business_documents").select("id, price, price_type").in("id", docIdsArr)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const eventMap = new Map<string, any>(((eventsRes.data as any[]) || []).map((e) => [e.id, e]));
  const immoMap = new Map<string, any>(((immoRes.data as any[]) || []).map((d) => [d.id, d]));

  const entryCards = entries.map((entry: any) => {
    const doc = firstDocByEntry[entry.id];
    const overrideBusinessId = overrideByEntry[entry.id] || null;
    const overrideImage = overrideImageByEntry[entry.id] || null;
    const subcategoryNames = (entry.subcategory_ids || [])
      .map((id: string) => subcatNameById.get(id))
      .filter(Boolean) as string[];
    if (!doc) {
      return {
        key: `entry:${entry.id}`, kind: "entry",
        data: {
          videoId: null, videoUrl: null, thumbnail: overrideImage,
          businessName: overrideBusinessId ? (bizMap.get(overrideBusinessId)?.name || null) : null,
          ownerLogo: null, ownerName: null, ownerId: null,
          rating: null, reviewCount: null, label: entry.name,
          subcategoryNames,
        },
      };
    }
    const ownerBiz = bizMap.get(doc.business_id) || null;
    const dispId = overrideBusinessId || doc.business_id;
    const dispBiz = bizMap.get(dispId) || null;
    return {
      key: `entry:${entry.id}`, kind: "entry",
      data: {
        videoId: doc.id, videoUrl: doc.url,
        thumbnail: overrideImage || doc.thumbnail_url || deriveThumbnail(doc.url),
        businessName: dispBiz?.name || null,
        ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
        ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
        ownerId: ownerBiz?.id || null,
        rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
        reviewCount: dispBiz?.total_review_count ?? null,
        label: entry.name,
        subcategoryNames,
      },
    };
  });

  const computeTarget = (card: any) => {
    if (card.event_id) return { type: "event", id: card.event_id };
    if (card.badge_id) return { type: "badge", id: card.badge_id };
    return null;
  };

  const extraPreviews = extraRows.map((card) => {
    const doc = extraDocByCard[card.id];
    // badge_id is only used to FILTER which video to pick — never displayed as label.
    const label = card.title?.trim() || null;
    const target = computeTarget(card);
    const event = card.event_id ? eventMap.get(card.event_id) : null;
    if (!doc) {
      const biz = card.business_id ? bizMap.get(card.business_id) : null;
      return {
        key: `extra:${card.id}`, kind: "extra",
        data: {
          videoId: null, videoUrl: null,
          thumbnail: card.image_url || event?.images?.[0] || null,
          businessName: event?.name || biz?.name || null,
          ownerLogo: null, ownerName: null, ownerId: null,
          rating: null, reviewCount: null, label,
          badgeId: card.badge_id || null,
          eventId: card.event_id || null,
          businessId: card.business_id || null,
          target,
        },
      };
    }
    const ownerBiz = bizMap.get(doc.business_id) || null;
    const dispId = card.business_id || doc.business_id;
    const dispBiz = bizMap.get(dispId) || null;
    const immo = immoMap.get(doc.id);
    const isImmo = (label || "").trim().toLowerCase() === "immobilier";
    return {
      key: `extra:${card.id}`, kind: "extra",
      data: {
        videoId: doc.id, videoUrl: doc.url,
        thumbnail: card.image_url || doc.thumbnail_url || deriveThumbnail(doc.url),
        businessName: dispBiz?.name || null,
        ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
        ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
        ownerId: ownerBiz?.id || null,
        rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
        reviewCount: dispBiz?.total_review_count ?? null,
        label,
        badgeId: card.badge_id || null,
        eventId: card.event_id || null,
        businessId: card.business_id || null,
        target,
        price: isImmo ? (immo?.price ?? null) : null,
        priceType: isImmo ? (immo?.price_type ?? null) : null,
      },
    };
  });

  const orderMap = new Map<string, number>();
  (orderRes.data || []).forEach((r: any) => {
    orderMap.set(`${r.item_type}:${r.item_id}`, r.sort_order);
  });

  const all = [...entryCards, ...extraPreviews];
  const ordered = all.filter((r) => orderMap.has(r.key)).sort((a, b) => orderMap.get(a.key)! - orderMap.get(b.key)!);
  const remaining = all.filter((r) => !orderMap.has(r.key));
  return [...ordered, ...remaining];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const cityParam: string | undefined = body?.city;

    let cities: string[] = [];
    if (cityParam) {
      cities = [cityParam];
    } else {
      const { data } = await supabase.from("cities").select("name_fr");
      cities = (data || []).map((c: any) => c.name_fr).filter(Boolean);
    }

    const results: { city: string; count: number }[] = [];
    for (const city of cities) {
      const snapshot = await buildSnapshot(supabase, city);
      const { error } = await supabase
        .from("homepage_cards_snapshots")
        .upsert({ city, payload: snapshot, generated_at: new Date().toISOString() }, { onConflict: "city" });
      if (error) throw error;
      results.push({ city, count: snapshot.length });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[regenerate-homepage-cards]", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
