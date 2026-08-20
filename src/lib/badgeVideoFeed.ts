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
}

export interface FetchBadgeVideoFeedOptions {
  seed?: string;
  limit?: number;
  offset?: number;
  cityIds?: string[] | null;
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
  const { data, error } = await (supabase as any).rpc("get_badge_video_feed", {
    _badge_id: badgeId,
    _seed: seed ?? getBadgeFeedSeed(badgeId),
    _limit: limit,
    _offset: offset,
    _city_ids: cityIds && cityIds.length > 0 ? cityIds : null,
  });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
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
  }));
}
