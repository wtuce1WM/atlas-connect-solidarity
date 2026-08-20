import { supabase } from "@/integrations/supabase/client";
import type { BlogArticleVideo } from "@/components/blog/BlogArticleTemplate";
import { fetchBadgeVideoFeed } from "@/lib/badgeVideoFeed";

export type VideoSectionCopy = { title: string; intro?: string };

export interface BlogVideoSectionConfig {
  badge_id: string;
  city_ids?: string[];
  price_type?: string; // e.g. 'location'
  /**
   * Opt-in : feed portrait 9:16 unifié (internes + génériques + Shorts YouTube),
   * ordre mélangé stable par session et alterné par établissement/auteur.
   * Sans ce drapeau, le comportement historique (2 sources, non filtré) est conservé.
   */
  shuffle_portrait_feed?: boolean;
  copy?: {
    fr?: VideoSectionCopy;
    en?: VideoSectionCopy;
    ar?: VideoSectionCopy;
  };
}


export function pickVideoSectionCopy(
  config: BlogVideoSectionConfig | null | undefined,
  language: string
): VideoSectionCopy {
  const copy = config?.copy;
  if (!copy) return { title: "" };
  if (language === "ar" && copy.ar) return copy.ar;
  if (language === "en" && copy.en) return copy.en;
  return copy.fr ?? copy.en ?? copy.ar ?? { title: "" };
}

/**
 * Fetch videos matching a badge (+ optional city ids + price_type) from both
 * business_documents (video type) and generic_videos.
 */
export async function fetchBlogVideoSection(
  config: BlogVideoSectionConfig
): Promise<BlogArticleVideo[]> {
  const { badge_id, city_ids, price_type } = config;
  const cityFilterActive = Array.isArray(city_ids) && city_ids.length > 0;

  // --- 1) Internal business_documents (video) filtered by badge (+ cities + price_type)
  let internal: BlogArticleVideo[] = [];
  const { data: badgedDocs } = await supabase
    .from("business_document_badges")
    .select("document_id")
    .eq("badge_id", badge_id);
  const docIds = (badgedDocs || []).map((d: any) => d.document_id);

  if (docIds.length > 0) {
    let scopedDocIds = docIds;
    if (cityFilterActive) {
      const { data: docCities } = await supabase
        .from("business_document_cities")
        .select("document_id")
        .in("document_id", docIds)
        .in("city_id", city_ids as string[]);
      scopedDocIds = Array.from(new Set((docCities || []).map((c: any) => c.document_id)));
    }
    if (scopedDocIds.length > 0) {
      let q = supabase
        .from("business_documents")
        .select(
          "id, business_id, name, description, price, price_type, url, youtube_video_url, instagram_video_url, tiktok_video_url, thumbnail_url, business_is_active"
        )
        .in("id", scopedDocIds)
        .eq("type", "video");
      if (price_type) q = q.eq("price_type", price_type);
      const { data: docs } = await q;
      const docs2 = (docs || []).filter((d: any) => d.business_is_active !== false);
      const bizIds = Array.from(new Set(docs2.map((d: any) => d.business_id).filter(Boolean)));
      const bizMap: Record<string, string> = {};
      if (bizIds.length > 0) {
        const { data: bizs } = await supabase.from("businesses").select("id, name").in("id", bizIds);
        (bizs || []).forEach((b: any) => (bizMap[b.id] = b.name));
      }
      internal = docs2.map((d: any) => ({
        id: d.id,
        url: d.youtube_video_url || d.instagram_video_url || d.tiktok_video_url || d.url || "",
        title: d.name || null,
        description: d.description || null,
        price: d.price || null,
        thumbnailUrl: d.thumbnail_url || null,
        isGeneric: false,
        businessId: d.business_id,
        businessName: bizMap[d.business_id] || null,
      }));
    }
  }

  // --- 2) Generic videos with the same badge (+ optional cities)
  let generic: BlogArticleVideo[] = [];
  const { data: badgedGen } = await supabase
    .from("generic_video_badges")
    .select("generic_video_id")
    .eq("badge_id", badge_id);
  const genIdsAll = (badgedGen || []).map((g: any) => g.generic_video_id);
  if (genIdsAll.length > 0) {
    let scopedGenIds = genIdsAll;
    if (cityFilterActive) {
      const { data: genCities } = await supabase
        .from("generic_video_cities")
        .select("generic_video_id")
        .in("generic_video_id", genIdsAll)
        .in("city_id", city_ids as string[]);
      scopedGenIds = Array.from(new Set((genCities || []).map((g: any) => g.generic_video_id)));
    }
    if (scopedGenIds.length > 0) {
      const { data: gens } = await supabase
        .from("generic_videos")
        .select("id, title, name, description, url, thumbnail_url")
        .in("id", scopedGenIds);
      generic = (gens || []).map((g: any) => ({
        id: g.id,
        url: g.url,
        title: g.title || g.name || null,
        description: g.description || null,
        price: null,
        thumbnailUrl: g.thumbnail_url || null,
        isGeneric: true,
        businessId: null,
        businessName: null,
      }));
    }
  }

  return [...internal, ...generic];
}
