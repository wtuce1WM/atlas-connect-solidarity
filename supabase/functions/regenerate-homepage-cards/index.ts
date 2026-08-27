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

/**
 * Homepage cards are driven EXCLUSIVELY by badge assignments
 * (front_structure_homepage_card_badges), with OR semantics:
 * a video is eligible if it carries AT LEAST ONE badge assigned to the card.
 * The only other accepted parameter is the forced image.
 */
async function resolveVideoByBadges(
  supabase: any,
  badgeIds: string[],
  cityDocIds: Set<string>,
  cityGenericIds: Set<string>,
) {
  if (badgeIds.length === 0) return null;

  // ---- internal videos ----
  const docIdSet = new Set<string>();
  for (const badgeId of badgeIds) {
    const { data } = await supabase
      .from("business_document_badges")
      .select("document_id")
      .eq("badge_id", badgeId);
    ((data as any[]) || []).forEach((r) => docIdSet.add(r.document_id as string));
  }
  const candidates = [...docIdSet].filter((id) => cityDocIds.size === 0 || cityDocIds.has(id));
  if (candidates.length > 0) {
    const chunks: Promise<any>[] = [];
    for (let i = 0; i < candidates.length; i += 300) {
      chunks.push(
        supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
          .eq("type", "video")
          .eq("business_is_active", true)
          .in("id", candidates.slice(i, i + 300))
          .order("sort_order", { ascending: true })
          .limit(1),
      );
    }
    const results = await Promise.all(chunks);
    let best: any = null;
    for (const r of results) {
      const row = (r.data && r.data[0]) || null;
      if (row && (!best || (row.sort_order ?? 0) < (best.sort_order ?? 0))) best = row;
    }
    if (best) return best;
  }

  // ---- generic videos ----
  const genIdSet = new Set<string>();
  for (const badgeId of badgeIds) {
    const { data } = await supabase
      .from("generic_video_badges")
      .select("generic_video_id")
      .eq("badge_id", badgeId);
    ((data as any[]) || []).forEach((r) => {
      const id = r.generic_video_id as string;
      if (id) genIdSet.add(id);
    });
  }
  const genCandidates = [...genIdSet].filter((id) => cityGenericIds.size === 0 || cityGenericIds.has(id));
  if (genCandidates.length === 0) return null;
  const { data: gvs } = await supabase
    .from("generic_videos")
    .select("id, url, thumbnail_url")
    .in("id", genCandidates.slice(0, 300))
    .limit(1);
  const gv = (gvs && gvs[0]) || null;
  if (!gv) return null;
  return {
    id: gv.id,
    url: gv.url,
    thumbnail_url: gv.thumbnail_url,
    business_id: null,
    poi_id: null,
    linked_business_id: null,
    sort_order: 0,
  };
}

async function buildSnapshot(supabase: any, city: string) {
  const aliasNames = getCityAliases(city);
  const [cityRowsRes, entriesRes, badgesRes, extraRes, orderRes, cardBadgesRes, overridesRes] = await Promise.all([
    supabase.from("cities").select("id").in("name_fr", aliasNames),
    supabase.from("front_structure").select("id, name, sort_order, show_in_menu").order("sort_order"),
    supabase.from("badges").select("id, name_fr"),
    supabase
      .from("front_structure_homepage_extra_cards")
      .select("id, city, image_url, sort_order, badge_id")
      .eq("city", city)
      .order("sort_order", { ascending: true }),
    supabase
      .from("front_structure_homepage_order")
      .select("item_type, item_id, sort_order")
      .eq("city", city)
      .order("sort_order", { ascending: true }),
    supabase
      .from("front_structure_homepage_card_badges")
      .select("item_type, item_id, badge_id, sort_order")
      .eq("city", city)
      .order("sort_order", { ascending: true }),
    supabase
      .from("front_structure_homepage_overrides")
      .select("front_structure_id, image_url")
      .eq("city", city),
  ]);

  // Plus de restriction géographique : /front ne filtre plus par ville.
  const cityDocIds = new Set<string>();
  const cityGenericIds = new Set<string>();


  const badgeMap = new Map<string, string>(((badgesRes.data as any[]) || []).map((b) => [b.id, b.name_fr]));

  const badgesByItem = new Map<string, string[]>();
  ((cardBadgesRes.data as any[]) || []).forEach((r) => {
    const key = `${r.item_type}:${r.item_id}`;
    const arr = badgesByItem.get(key) || [];
    arr.push(r.badge_id);
    badgesByItem.set(key, arr);
  });

  const forcedImageByEntry = new Map<string, string | null>();
  ((overridesRes.data as any[]) || []).forEach((o) => {
    if (o.image_url) forcedImageByEntry.set(o.front_structure_id, o.image_url);
  });

  const entries = ((entriesRes.data as any[]) || []).filter((e) => e.show_in_menu !== false);
  const extraRows = ((extraRes.data as any[]) || []);

  const targets = [
    ...entries.map((e) => ({
      kind: "entry" as const,
      id: e.id,
      label: e.name,
      forcedImage: forcedImageByEntry.get(e.id) || null,
    })),
    ...extraRows.map((c) => ({
      kind: "extra" as const,
      id: c.id,
      label: (badgeMap.get(c.badge_id) as string | undefined) || null,
      forcedImage: c.image_url || null,
    })),

  ];

  const docs = await Promise.all(
    targets.map((t) =>
      resolveVideoByBadges(supabase, badgesByItem.get(`${t.kind}:${t.id}`) || [], cityDocIds, cityGenericIds),
    ),
  );

  const allBizIds = new Set<string>();
  docs.forEach((d) => {
    if (!d) return;
    if (d.business_id) allBizIds.add(d.business_id);
    const disp = d.poi_id || d.linked_business_id || d.business_id;
    if (disp) allBizIds.add(disp);
  });

  const bizMap = new Map<string, any>();
  const bizIdsArr = [...allBizIds];
  const bizChunks: Promise<any>[] = [];
  for (let i = 0; i < bizIdsArr.length; i += 300) {
    bizChunks.push(
      supabase
        .from("businesses")
        .select("id, name, logo_url, computed_rating, rating, total_review_count")
        .in("id", bizIdsArr.slice(i, i + 300)),
    );
  }
  const bizResults = await Promise.all(bizChunks);
  bizResults.forEach((r) => (r.data || []).forEach((b: any) => bizMap.set(b.id, b)));

  const cards = targets.map((t, idx) => {
    const doc = docs[idx];
    const assigned = badgesByItem.get(`${t.kind}:${t.id}`) || [];
    const label =
      t.kind === "entry"
        ? t.label
        : assigned.map((b) => badgeMap.get(b)).filter(Boolean).join(" / ") || t.label;

    const primaryBadgeId = assigned[0] || null;
    const target = t.kind === "extra" && primaryBadgeId ? { type: "badge", id: primaryBadgeId } : null;

    if (!doc) {
      return {
        key: `${t.kind}:${t.id}`,
        kind: t.kind,
        data: {
          videoId: null,
          videoUrl: null,
          thumbnail: t.forcedImage,
          businessName: null,
          ownerLogo: null,
          ownerName: null,
          ownerId: null,
          rating: null,
          reviewCount: null,
          label,
          badgeIds: assigned,
          badgeId: primaryBadgeId,
          eventId: null,
          businessId: null,
          target,
        },
      };
    }

    const dispId = doc.poi_id || doc.linked_business_id || doc.business_id;
    const dispBiz = dispId ? bizMap.get(dispId) || null : null;
    const ownerBiz = doc.business_id ? bizMap.get(doc.business_id) || null : null;
    return {
      key: `${t.kind}:${t.id}`,
      kind: t.kind,
      data: {
        videoId: doc.id,
        videoUrl: doc.url,
        thumbnail: t.forcedImage || doc.thumbnail_url || deriveThumbnail(doc.url),
        businessName: dispBiz?.name || null,
        ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
        ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
        ownerId: ownerBiz?.id || null,
        rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
        reviewCount: dispBiz?.total_review_count ?? null,
        label,
        badgeIds: assigned,
        badgeId: primaryBadgeId,
        eventId: null,
        businessId: null,
        target,
      },
    };
  });

  const orderMap = new Map<string, number>();
  ((orderRes.data as any[]) || []).forEach((r) => {
    orderMap.set(`${r.item_type}:${r.item_id}`, r.sort_order);
  });

  const ordered = cards.filter((r) => orderMap.has(r.key)).sort((a, b) => orderMap.get(a.key)! - orderMap.get(b.key)!);
  const remaining = cards.filter((r) => !orderMap.has(r.key));
  return [...ordered, ...remaining];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
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
