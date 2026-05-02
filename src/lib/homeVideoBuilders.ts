// Pure builders for VideoItem-like objects used on the homepage.
// Extracted from src/pages/Home.tsx to mutualize 4+ duplicated mapping blocks.
// Behavior MUST stay identical to the inlined versions: same field shapes,
// same null-fallbacks, same social handling.

import { supabase } from "@/integrations/supabase/client";
import {
  extractSocial,
  isDifferentDisplayedBusinessSocial,
  resolveVideoEstablishment,
  type OwnerInfo,
  type SocialInfo,
} from "@/lib/homeHelpers";
import { chunked } from "@/lib/homeFetchHelpers";

/** Build the OwnerInfo subobject from a business row (or null). */
export function toOwner(biz: any | null | undefined): OwnerInfo | null {
  if (!biz) return null;
  return {
    id: biz.id,
    name: biz.name,
    logo_url: biz.logo_url ?? null,
    logo_bg: biz.logo_bg ?? null,
  };
}

/** YouTube video URL (short or watch) from a business_youtube_videos row. */
export function youtubeVideoUrl(y: { is_short?: boolean | null; video_id: string }): string {
  return y.is_short
    ? `https://www.youtube.com/shorts/${y.video_id}`
    : `https://www.youtube.com/watch?v=${y.video_id}`;
}

/** Default YouTube thumbnail (custom > thumbnail > maxres). */
export function youtubeThumbnailUrl(y: {
  custom_thumbnail_url?: string | null;
  thumbnail?: string | null;
  video_id: string;
}): string {
  return y.custom_thumbnail_url || y.thumbnail || `https://i.ytimg.com/vi/${y.video_id}/maxresdefault.jpg`;
}

/**
 * Build the social info for a YouTube video card from the business `youtube_url`.
 * Mirrors the inlined `(biz as any)?.youtube_url ? ...split.../filter/pop()` pattern.
 */
export function youtubeSocialFromBusiness(biz: any | null): SocialInfo | null {
  const url = (biz as any)?.youtube_url as string | null | undefined;
  if (!url) return null;
  const account = url.split("/").filter(Boolean).pop() || "";
  if (!account) return null;
  return { platform: "youtube", account, url };
}

export interface BuildDocVideoItemArgs {
  doc: any;
  bizMap: Map<string, any>;
  /** Pass strict to mirror resolveVideoEstablishment({ strict: true }). */
  strict?: boolean;
  /** Optional manualCard map (homepage editorial overlay). */
  manualCardMap?: Map<string, { label: string; badgeId: string | null; eventId?: string | null }>;
  /** Doc id → badge ids. */
  docBadgesByDocId?: Record<string, string[]>;
  /** service_id → name_fr. */
  serviceNameById?: Map<string, string>;
  /**
   * When true, also expose `pageBusinessName` / `pageBusinessId` from the
   * doc's original `business_id` (used by badge view to keep the POI label).
   */
  withPageBusiness?: boolean;
  /** Include `price` / `priceType` (only used by event branches). */
  withPrice?: boolean;
}

/**
 * Build a VideoItem from a `business_documents` row + a businesses lookup map.
 * Centralizes the 4 duplicated mapping blocks scattered across Home.tsx.
 * Returns `any` to avoid coupling this helper to the page-local VideoItem type.
 */
export function buildDocVideoItem(args: BuildDocVideoItemArgs): any {
  const { doc: d, bizMap, strict, manualCardMap, docBadgesByDocId, serviceNameById, withPageBusiness, withPrice } =
    args;
  const biz = resolveVideoEstablishment(d, bizMap, { strict });
  const social = extractSocial(d);
  const item: any = {
    id: d.id,
    url: d.url,
    business_name: biz?.name || "—",
    thumbnail_url: d.thumbnail_url,
    business: biz,
    owner: toOwner(biz),
    social,
    showSocialBadge: isDifferentDisplayedBusinessSocial(social, biz),
    description: d.description ?? null,
    manualCard: manualCardMap?.get(d.id) || null,
    subcategory_id: d.subcategory_id ?? null,
    service_id: d.service_id ?? null,
    service_name: d.service_id ? serviceNameById?.get(d.service_id) ?? null : null,
    badge_ids: docBadgesByDocId?.[d.id] || [],
    videoTitle: d.name ?? null,
  };
  if (withPageBusiness) {
    // Show the original business_id's name on the thumbnail (e.g. POI),
    // even when a linked establishment exists (which still drives owner/logo).
    const thumbnailBiz = (d.business_id && bizMap.get(d.business_id)) || biz;
    item.business_name = thumbnailBiz?.name || biz?.name || "—";
    item.pageBusinessName = thumbnailBiz?.name ?? null;
    item.pageBusinessId = d.business_id ?? null;
  }
  if (withPrice) {
    item.price = d.price ?? null;
    item.priceType = d.price_type ?? null;
  }
  return item;
}

export interface BuildYoutubeVideoItemArgs {
  yt: any;
  business: any | null;
  ytBadgesByVideo?: Record<string, string[]>;
}

/**
 * Build a VideoItem from a `business_youtube_videos` row + a business.
 * Centralizes the 2 duplicated mapping blocks for YT-video cards on Home.
 */
export function buildYoutubeVideoItem(args: BuildYoutubeVideoItemArgs): any | null {
  const { yt: y, business: biz, ytBadgesByVideo } = args;
  if (!y || !biz) return null;
  const url = youtubeVideoUrl(y);
  const social = youtubeSocialFromBusiness(biz);
  return {
    id: y.id,
    url,
    business_name: biz?.name || y.title || "—",
    thumbnail_url: youtubeThumbnailUrl(y),
    business: biz,
    owner: toOwner(biz),
    social,
    showSocialBadge: !!social,
    description: null,
    manualCard: null,
    badge_ids: ytBadgesByVideo?.[y.id] || [],
    // External YouTube videos: show the YouTube title (not the business hook).
    videoTitle: y.title ?? null,
  };
}

/**
 * Resolve the `cities.id` for a French city name. Returns null when not found.
 * Mirrors the 5 inlined `.from("cities").select("id").eq("name_fr", city).maybeSingle()` calls.
 */
export async function getCityIdByName(city: string): Promise<string | null> {
  const { data } = await supabase
    .from("cities")
    .select("id")
    .eq("name_fr", city)
    .maybeSingle();
  return ((data as any)?.id as string) ?? null;
}

/**
 * Fetch `services.name_fr` for the given ids and return a Map<id, name_fr>.
 * Chunked at 300 to stay safe with `.in()`.
 */
export async function fetchServiceNamesByIds(ids: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!ids || ids.length === 0) return out;
  const filtered = [...new Set(ids.filter(Boolean))] as string[];
  await chunked(filtered, async (chunk) => {
    const { data } = await supabase.from("services").select("id, name_fr").in("id", chunk);
    ((data as any[]) || []).forEach((s: any) => out.set(s.id, s.name_fr));
    return [];
  });
  return out;
}
