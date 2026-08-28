import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CITY_ALIASES: Record<string, string[]> = {
  Marrakech: ["Marrakech", "Agafay"],
  Essaouira: ["Essaouira"],
};
const getCityAliases = (c: string): string[] => CITY_ALIASES[c] || [c];

/**
 * Homepage cards are driven EXCLUSIVELY by badge assignments
 * (front_structure_homepage_card_badges, OR semantics) plus the forced image.
 * No video/business is resolved any more: nothing is picked automatically.
 */
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

  const cards = targets.map((t) => {
    const assigned = badgesByItem.get(`${t.kind}:${t.id}`) || [];
    const label =
      t.kind === "entry"
        ? t.label
        : assigned.map((b) => badgeMap.get(b)).filter(Boolean).join(" / ") || t.label;

    const primaryBadgeId = assigned[0] || null;
    const target = t.kind === "extra" && primaryBadgeId ? { type: "badge", id: primaryBadgeId } : null;

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
