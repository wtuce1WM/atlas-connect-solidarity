// ============================================================================
// Route déterministe partagée : VIDEO FEED (mode = 'video_feed')
//
// Objectif : une suggestion / relance dont le mode est `video_feed` ne renvoie
// PAS un carrousel de fiches établissements, mais un feed de vidéos (mix
// internes `business_documents.type = 'video'` + génériques `generic_videos`)
// ciblées par les badges de l'entrée curatée. Aucun LLM, aucun token.
//
// Le front reçoit un marqueur `<!--VIDEO_FEED:{...}-->` et ouvre le slidepanel
// vidéo habituel (swipe vertical) — même composant que /videos/:slug.
// ============================================================================

export type Lang = "fr" | "en" | "ar";

export type VideoFeedItem = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  price: string | null;
  thumbnailUrl: string | null;
  isGeneric: boolean;
  businessId: string | null;
  businessName: string | null;
};

export type VideoFeedAnswer = {
  text: string;
  payload: { title: string | null; videos: VideoFeedItem[] };
  count: number;
  route: string;
};

/**
 * Charge les vidéos ciblées par badges (et, à défaut, par établissements épinglés).
 * Ordre : vidéos internes puis génériques, dans l'ordre des badges fournis.
 */
export async function loadVideoFeed(
  admin: any,
  opts: { badgeIds: string[]; pinnedBusinessIds?: string[]; max?: number },
): Promise<VideoFeedItem[]> {
  const max = opts.max ?? 30;
  const badgeIds = (opts.badgeIds || []).filter(Boolean);
  const pinned = (opts.pinnedBusinessIds || []).filter(Boolean);

  const internal: VideoFeedItem[] = [];
  const generic: VideoFeedItem[] = [];

  // ---- 1) Vidéos internes (business_documents type=video)
  let docIds: string[] = [];
  if (badgeIds.length) {
    const { data: badged } = await admin
      .from("business_document_badges")
      .select("document_id")
      .in("badge_id", badgeIds);
    docIds = [...new Set((badged || []).map((d: any) => String(d.document_id)))];
  }

  let docQuery: any = null;
  if (docIds.length) {
    docQuery = admin
      .from("business_documents")
      .select("id, business_id, name, description, price, url, youtube_video_url, instagram_video_url, tiktok_video_url, thumbnail_url, business_is_active")
      .in("id", docIds)
      .eq("type", "video");
  } else if (pinned.length) {
    // Aucun badge : on retombe sur les vidéos des établissements épinglés.
    docQuery = admin
      .from("business_documents")
      .select("id, business_id, name, description, price, url, youtube_video_url, instagram_video_url, tiktok_video_url, thumbnail_url, business_is_active")
      .in("business_id", pinned)
      .eq("type", "video");
  }

  if (docQuery) {
    const { data: docs } = await docQuery;
    const rows = (docs || []).filter((d: any) => d.business_is_active !== false);
    const bizIds = [...new Set(rows.map((d: any) => d.business_id).filter(Boolean))] as string[];
    const bizMap = new Map<string, string>();
    if (bizIds.length) {
      const { data: bizs } = await admin.from("businesses").select("id, name").in("id", bizIds);
      for (const b of bizs || []) bizMap.set(String(b.id), String(b.name));
    }
    for (const d of rows) {
      const url = d.youtube_video_url || d.instagram_video_url || d.tiktok_video_url || d.url || "";
      if (!url) continue;
      internal.push({
        id: String(d.id),
        url,
        title: d.name || null,
        description: d.description || null,
        price: d.price || null,
        thumbnailUrl: d.thumbnail_url || null,
        isGeneric: false,
        businessId: d.business_id ? String(d.business_id) : null,
        businessName: d.business_id ? bizMap.get(String(d.business_id)) ?? null : null,
      });
    }
  }

  // ---- 2) Vidéos génériques portant les mêmes badges
  if (badgeIds.length) {
    const { data: badgedGen } = await admin
      .from("generic_video_badges")
      .select("generic_video_id")
      .in("badge_id", badgeIds);
    const genIds = [...new Set((badgedGen || []).map((g: any) => String(g.generic_video_id)))];
    if (genIds.length) {
      const { data: gens } = await admin
        .from("generic_videos")
        .select("id, title, name, description, url, thumbnail_url")
        .in("id", genIds);
      for (const g of gens || []) {
        if (!g?.url) continue;
        generic.push({
          id: String(g.id),
          url: String(g.url),
          title: g.title || g.name || null,
          description: g.description || null,
          price: null,
          thumbnailUrl: g.thumbnail_url || null,
          isGeneric: true,
          businessId: null,
          businessName: null,
        });
      }
    }
  }

  const seen = new Set<string>();
  const out: VideoFeedItem[] = [];
  for (const v of [...internal, ...generic]) {
    const key = v.url.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/** Construit la réponse déterministe (texte court + payload marqueur). */
export async function buildVideoFeedAnswer(
  admin: any,
  opts: { badgeIds: string[]; pinnedBusinessIds?: string[]; label?: string | null; lang: Lang; max?: number },
): Promise<VideoFeedAnswer | null> {
  const videos = await loadVideoFeed(admin, {
    badgeIds: opts.badgeIds,
    pinnedBusinessIds: opts.pinnedBusinessIds,
    max: opts.max ?? 30,
  });
  if (!videos.length) return null;

  const lang = opts.lang;
  const label = (opts.label || "").trim();
  const n = videos.length;
  const head = label ? `**${label}**\n\n` : "";
  const text =
    lang === "en"
      ? `${head}${n} video${n > 1 ? "s" : ""} to watch. Tap a thumbnail to open the player, then swipe up or down to move through the feed.`
      : lang === "ar"
        ? `${head}${n} فيديو للمشاهدة. اضغط على صورة مصغّرة لفتح المشغّل، ثم اسحب لأعلى أو لأسفل للتنقل.`
        : `${head}${n} vidéo${n > 1 ? "s" : ""} à découvrir. Clique sur une miniature pour ouvrir le lecteur, puis fais défiler verticalement pour passer à la suivante.`;

  return {
    text,
    payload: { title: label || null, videos },
    count: n,
    route: "video_feed",
  };
}

/** Sérialise le marqueur front (échappe `-->` comme les autres marqueurs). */
export function videoFeedMarker(payload: { title: string | null; videos: VideoFeedItem[] }): string {
  const safe = JSON.stringify(payload).replace(/-->/g, "--&gt;");
  return `\n\n<!--VIDEO_FEED:${safe}-->`;
}
