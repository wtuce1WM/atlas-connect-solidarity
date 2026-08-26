// Feed vidéo par badge — source de vérité unique côté base.
//
// La fonction SQL `get_badge_video_feed` unifie les 3 sources hétérogènes
// (business_documents type=video, generic_videos, business_youtube_videos),
// ne garde que le portrait 9:16, mélange de façon stable via un seed et
// alterne par établissement/auteur (round-robin) pour éviter les séries
// de vidéos du même compte.
//
// Le seed est conservé en sessionStorage : l'ordre reste identique pendant
// la session (pas de saut visuel au retour), mais change à la session
// suivante — et peut être régénéré volontairement (rebouclage de fin de feed).

import { supabase } from "@/integrations/supabase/client";
import type { BlogArticleVideo } from "@/components/blog/BlogArticleTemplate";

const SEED_PREFIX = "owm_badge_feed_seed:";

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Seed stable pour la session courante (créé au premier appel). */
export function getBadgeFeedSeed(badgeId: string): string {
  const key = SEED_PREFIX + badgeId;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const seed = randomSeed();
    sessionStorage.setItem(key, seed);
    return seed;
  } catch {
    return randomSeed();
  }
}

/** Force un nouvel ordre (fin de feed atteinte, ou bouton « mélanger »). */
export function resetBadgeFeedSeed(badgeId: string): string {
  const seed = randomSeed();
  try {
    sessionStorage.setItem(SEED_PREFIX + badgeId, seed);
  } catch {
    /* mode privé : seed volatile */
  }
  return seed;
}

export interface BadgeVideoFeedItem extends BlogArticleVideo {
  source: "internal" | "generic" | "youtube";
  businessLogoUrl?: string | null;
  businessLogoBg?: string | null;
  /** Compte social attaché à la vidéo (logo + « Follow @… » dans le lecteur). */
  social?: { platform: "instagram" | "tiktok" | "youtube"; account: string; url: string | null } | null;
  /** Badges « Activé sur le front » liés à la vidéo (chips cliquables du viewer). */
  badges?: FeedBadge[];
}

export interface FeedBadge {
  id: string;
  name: string;
  name_en?: string | null;
  color?: string | null;
  text_color?: string | null;
  sort_order?: number | null;
}

export interface FetchBadgeVideoFeedOptions {
  seed?: string;
  limit?: number;
  offset?: number;
  cityIds?: string[] | null;
}

// TEMPORAIRE — debug : force une vidéo en tête de feed pour certains badges.
// TODO: retirer dès que le debug est terminé (ou le transformer en règle
// durable pilotée en backoffice si le mécanisme est validé).
const DEBUG_PINNED_VIDEO_BY_BADGE: Record<string, string> = {
  "b1113b87-127a-43e0-be80-d3262934a320": "091bfa7b-6182-4d25-93c2-4d61d48a61ea", // #Vlogs
  "8f69db35-fc59-4c59-861e-15f748e829b8": "091bfa7b-6182-4d25-93c2-4d61d48a61ea", // Excursions
};

// Exception à l'épinglage : une vidéo générique dont les liaisons sont
// placées sur des timeframes (cartes POI/business/destination minutées dans
// le viewer) ne doit PAS être épinglée — l'épinglage donnerait une visibilité
// forcée à ses liaisons timeframes (ex. Riad Dar Najat sur 091bfa7b) sans
// que la donnée backoffice soit modifiée. Dans ce cas, on ignore le pin et
// on laisse le mélange standard par seed décider de l'ordre.
async function pinnedVideoUsesTimeframes(videoId: string): Promise<boolean> {
  const countQuery = (table: string) =>
    (supabase as any)
      .from(table)
      .select("generic_video_id", { count: "exact", head: true })
      .eq("generic_video_id", videoId)
      .eq("timeframe_enabled", true);
  const [pois, biz, dests] = await Promise.all([
    countQuery("generic_video_pois"),
    countQuery("generic_video_businesses"),
    countQuery("generic_video_destinations"),
  ]);
  return ((pois.count ?? 0) + (biz.count ?? 0) + (dests.count ?? 0)) > 0;
}

/**
 * Charge une page du feed portrait d'un badge, prête à alimenter
 * `HomeVideoSlidePanel` (donc `BookOnlineSlidePanel`) sans transformation.
 */
export async function fetchBadgeVideoFeed(
  badgeId: string,
  options: FetchBadgeVideoFeedOptions = {},
): Promise<BadgeVideoFeedItem[]> {
  const { seed, limit = 60, offset = 0, cityIds } = options;
  // TEMPORAIRE — debug : on élargit le pool pour s'assurer de récupérer la
  // vidéo épinglée, puis on la force en tête.
  let pinnedVideoId = offset === 0 ? DEBUG_PINNED_VIDEO_BY_BADGE[badgeId] : undefined;
  // Exception : pas d'épinglage si la vidéo utilise des liaisons en timeframes.
  if (pinnedVideoId && (await pinnedVideoUsesTimeframes(pinnedVideoId))) {
    pinnedVideoId = undefined;
  }
  const rpcLimit = pinnedVideoId ? 300 : limit;
  const { data, error } = await (supabase as any).rpc("get_badge_video_feed", {
    _badge_id: badgeId,
    _seed: seed ?? getBadgeFeedSeed(badgeId),
    _limit: rpcLimit,
    _offset: offset,
    _city_ids: cityIds && cityIds.length > 0 ? cityIds : null,
  });
  if (error || !data) return [];
  let items = (data as any[]).map(mapFeedRow);

  // TEMPORAIRE — debug : force la vidéo épinglée en première position.
  if (pinnedVideoId) {
    const idx = items.findIndex((i) => i.id === pinnedVideoId);
    if (idx >= 0) {
      const [forced] = items.splice(idx, 1);
      items.unshift(forced);
    }
    items = items.slice(0, limit);
  }

  return items;
}

function mapFeedRow(r: any): BadgeVideoFeedItem {
  return {
    id: String(r.id),
    source: r.source,
    url: r.url,
    title: r.title || "",
    description: r.description ?? null,
    price: r.price ?? null,
    thumbnailUrl: r.thumbnail_url ?? null,
    isGeneric: !!r.is_generic,
    businessId: r.business_id ?? null,
    businessName: r.business_name ?? null,
    businessLogoUrl: r.business_logo_url ?? null,
    businessLogoBg: r.business_logo_bg ?? null,
    badges: Array.isArray(r.badges) ? (r.badges as FeedBadge[]) : [],
    social: r.social_platform && r.social_account
      ? { platform: r.social_platform, account: String(r.social_account).replace(/^@+/, ""), url: r.social_url ?? null }
      : null,
  };
}

/**
 * Version multi-badges (standard des suggestions IA `video_feed`) : même mélange
 * stable par seed + round-robin, et renvoie le nombre total réel de vidéos
 * éligibles pour permettre la pagination du feed.
 */
export async function fetchBadgesVideoFeed(
  badgeIds: string[],
  options: FetchBadgeVideoFeedOptions = {},
): Promise<{ items: BadgeVideoFeedItem[]; total: number }> {
  const ids = (badgeIds || []).filter(Boolean);
  if (!ids.length) return { items: [], total: 0 };
  const { seed, limit = 60, offset = 0, cityIds } = options;
  const { data, error } = await (supabase as any).rpc("get_badges_video_feed", {
    _badge_ids: ids,
    _seed: seed ?? getBadgeFeedSeed(ids.join(",")),
    _limit: limit,
    _offset: offset,
    _city_ids: cityIds && cityIds.length > 0 ? cityIds : null,
  });
  if (error || !data) return { items: [], total: 0 };
  const rows = data as any[];
  return {
    items: rows.map(mapFeedRow),
    total: rows.length ? Number(rows[0].total_count ?? rows.length) : 0,
  };
}


/* ------------------------------------------------------------------ *
 * Mode « découverte » (CTA Demo de /front)
 * ------------------------------------------------------------------ *
 * Même source de vérité (`get_badges_video_feed`) : mélange stable par
 * seed + round-robin par établissement/auteur. Différences :
 *  - le pool est l'ensemble des badges « Activé sur le front »
 *    (`badges.is_active_on_front`), donc aucune vidéo non badgée ;
 *  - villes autorisées : Marrakech, Essaouira, ou aucune ville
 *    (`_include_no_city`) ;
 *  - le seed est tiré à chaque ouverture (découverte aléatoire).
 */

const DISCOVERY_CITIES = ["Marrakech", "Essaouira"];

export interface DiscoveryFeedContext {
  badgeIds: string[];
  cityIds: string[];
  seed: string;
  total: number;
}


/** Badges activés sur le front + villes de découverte. */
async function loadDiscoveryScope(): Promise<{ badgeIds: string[]; cityIds: string[] }> {
  const [badgesRes, citiesRes] = await Promise.all([
    (supabase as any).from("badges").select("id").eq("is_active_on_front", true),
    (supabase as any).from("cities").select("id").in("name_fr", DISCOVERY_CITIES),
  ]);
  return {
    badgeIds: ((badgesRes?.data as any[]) || []).map((b) => String(b.id)),
    cityIds: ((citiesRes?.data as any[]) || []).map((c) => String(c.id)),
  };
}

async function fetchDiscoveryPage(
  scope: { badgeIds: string[]; cityIds: string[] },
  seed: string,
  limit: number,
  offset: number,
  includeNoCity = true,
): Promise<{ items: BadgeVideoFeedItem[]; total: number }> {
  const { data, error } = await (supabase as any).rpc("get_badges_video_feed", {
    _badge_ids: scope.badgeIds,
    _seed: seed,
    _limit: limit,
    _offset: offset,
    _city_ids: scope.cityIds.length ? scope.cityIds : null,
    _include_no_city: includeNoCity,
  });

  if (error || !data) return { items: [], total: 0 };
  const rows = data as any[];
  return {
    items: rows.map(mapFeedRow),
    total: rows.length ? Number(rows[0].total_count ?? rows.length) : 0,
  };
}

/**
 * Vidéo YouTube aléatoire d'un établissement donné, mise en tête du feed.
 * Uniquement des Shorts : le feed découverte doit rester portrait sur ses
 * premiers résultats (les vidéos longues sont en 16:9).
 */
async function fetchRandomYoutubeVideoOf(
  businessName: string,
  badgeIds: string[],
): Promise<BadgeVideoFeedItem | null> {
  const { data: biz } = await (supabase as any)
    .from("businesses")
    .select("id, name, logo_url, youtube_url")
    .ilike("name", businessName)
    .limit(1)
    .maybeSingle();
  if (!biz?.id) return null;
  const { data } = await (supabase as any)
    .from("business_youtube_videos")
    .select("id, video_id, title, is_short, thumbnail, custom_thumbnail_url, business_youtube_video_badges!inner(badge_id)")
    .eq("business_id", biz.id)
    .eq("is_short", true)
    .in("business_youtube_video_badges.badge_id", badgeIds)
    .not("video_id", "is", null);
  const rows = ((data as any[]) || []).filter((r) => r.video_id);

  if (!rows.length) return null;
  const r = rows[Math.floor(Math.random() * rows.length)];
  // Badges « Activé sur le front » de la vidéo injectée (chips du viewer).
  const { data: badgeLinks } = await (supabase as any)
    .from("business_youtube_video_badges")
    .select("badges!inner(id, name_fr, name_en, color_hex, text_color_hex, sort_order, is_active_on_front)")
    .eq("youtube_video_id", r.id);
  const badges: FeedBadge[] = ((badgeLinks as any[]) || [])
    .map((l) => l.badges)
    .filter((b: any) => b?.is_active_on_front)
    .map((b: any) => ({
      id: String(b.id),
      name: b.name_fr,
      name_en: b.name_en ?? null,
      color: b.color_hex ?? null,
      text_color: b.text_color_hex ?? null,
      sort_order: b.sort_order ?? null,
    }));
  return {
    badges,
    id: String(r.id),
    source: "youtube",
    url: (r.is_short ? "https://www.youtube.com/shorts/" : "https://www.youtube.com/watch?v=") + r.video_id,
    title: r.title || "",
    description: null,
    price: null,
    thumbnailUrl: r.custom_thumbnail_url || r.thumbnail || `https://i.ytimg.com/vi/${r.video_id}/hqdefault.jpg`,
    isGeneric: false,
    businessId: String(biz.id),
    businessName: biz.name,
    businessLogoUrl: biz.logo_url ?? null,
    businessLogoBg: null,
    social: { platform: "youtube", account: String(biz.name), url: biz.youtube_url ?? null },
  } as BadgeVideoFeedItem;
}

/**
 * Premier lot du feed découverte, avec injection éditoriale d'une vidéo
 * YouTube aléatoire de `featuredAuthor` en tête (si elle n'est pas déjà là).
 */
export async function fetchDiscoveryVideoFeed(options: {
  limit?: number;
  featuredAuthor?: string | null;
} = {}): Promise<{ items: BadgeVideoFeedItem[]; ctx: DiscoveryFeedContext }> {
  const { limit = 60, featuredAuthor = null } = options;
  const seed = randomSeed();
  const scope = await loadDiscoveryScope();
  const empty: DiscoveryFeedContext = { ...scope, seed, total: 0 };
  if (!scope.badgeIds.length) return { items: [], ctx: empty };

  const [{ items, total }, featured] = await Promise.all([
    fetchDiscoveryPage(scope, seed, limit, 0),
    featuredAuthor ? fetchRandomYoutubeVideoOf(featuredAuthor, scope.badgeIds) : Promise.resolve(null),
  ]);

  let list = items;
  if (featured) {
    list = [featured, ...items.filter((it) => it.id !== featured.id)];
  }
  return { items: list, ctx: { ...scope, seed, total } };
}

/** Pagination du feed découverte (même seed, donc même ordre). */
export async function fetchDiscoveryVideoFeedPage(
  ctx: DiscoveryFeedContext,
  offset: number,
  limit = 30,
): Promise<BadgeVideoFeedItem[]> {
  const { items } = await fetchDiscoveryPage(
    { badgeIds: ctx.badgeIds, cityIds: ctx.cityIds },
    ctx.seed,
    limit,
    offset,
    ctx.includeNoCity !== false,
  );
  return items;
}

/**
 * Relance du feed découverte sur un seul badge (clic sur une chip du viewer).
 * Même périmètre géographique (Marrakech / Essaouira / sans ville), nouveau seed.
 */
export async function fetchDiscoveryVideoFeedForBadge(
  ctx: DiscoveryFeedContext,
  badgeId: string,
  limit = 60,
): Promise<{ items: BadgeVideoFeedItem[]; ctx: DiscoveryFeedContext }> {
  const seed = randomSeed();
  const scope = { badgeIds: [badgeId], cityIds: ctx.cityIds };
  const { items, total } = await fetchDiscoveryPage(scope, seed, limit, 0, ctx.includeNoCity !== false);
  return { items, ctx: { ...scope, seed, total, includeNoCity: ctx.includeNoCity !== false } };
}

/**
 * Relance du feed découverte sur une seule ville (clic sur la chip ville du
 * viewer). Le pool de badges repasse à l'ensemble des badges « Activé sur le
 * front » ; seules les vidéos rattachées à cette ville sont retenues.
 */
export async function fetchDiscoveryVideoFeedForCity(
  ctx: DiscoveryFeedContext,
  cityId: string,
  limit = 60,
): Promise<{ items: BadgeVideoFeedItem[]; ctx: DiscoveryFeedContext }> {
  const seed = randomSeed();
  const full = await loadDiscoveryScope();
  const scope = { badgeIds: full.badgeIds, cityIds: [cityId] };
  const { items, total } = await fetchDiscoveryPage(scope, seed, limit, 0, false);
  return { items, ctx: { ...scope, seed, total, includeNoCity: false } };
}
