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
  /** Compte social attaché à la vidéo (logo + « Follow @… » dans le lecteur). */
  social?: { platform: "instagram" | "tiktok" | "youtube"; account: string; url: string | null } | null;
  /** Badges actifs sur le front attachés à la vidéo (chips cliquables dans le lecteur). */
  badges?: { id: string; name: string; color?: string | null; text_color?: string | null }[] | null;
};

export type VideoFeedAnswer = {
  text: string;
  payload: {
    title: string | null;
    videos: VideoFeedItem[];
    /** Nombre RÉEL de vidéos éligibles (peut dépasser `videos.length`). */
    total: number;
    /** Contexte de pagination du feed (round-robin stable côté base). */
    badgeIds?: string[];
    seed?: string;
  };
  count: number;
  route: string;
};

function normCity(v: any): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Résout un nom de ville en ids `cities` (FR ou EN). */
async function resolveCityIds(admin: any, city?: string | null): Promise<string[] | null> {
  const target = normCity(city);
  if (!target) return null;
  const { data } = await admin.from("cities").select("id, name_fr, name_en");
  const ids = (data || [])
    .filter((c: any) => normCity(c.name_fr) === target || normCity(c.name_en) === target)
    .map((c: any) => String(c.id));
  return ids.length ? ids : null;
}

export type VideoFeedLoad = { videos: VideoFeedItem[]; total: number; seed: string };

/**
 * Charge les vidéos portrait 9:16 badgées via la source de vérité unique
 * `get_badges_video_feed` (mélange stable par seed + round-robin par
 * établissement/auteur), et renvoie le nombre total réel.
 * Repli legacy (sans mélange) uniquement si aucun badge n'est fourni.
 */
export async function loadBadgeVideoFeed(
  admin: any,
  opts: { badgeIds: string[]; max?: number; city?: string | null; seed?: string },
): Promise<VideoFeedLoad> {
  const max = Math.min(Math.max(opts.max ?? 30, 1), 300);
  const seed = opts.seed || Math.random().toString(36).slice(2, 10);
  const badgeIds = (opts.badgeIds || []).filter(Boolean);
  if (!badgeIds.length) return { videos: [], total: 0, seed };

  const cityIds = await resolveCityIds(admin, opts.city).catch(() => null);
  const { data, error } = await admin.rpc("get_badges_video_feed", {
    _badge_ids: badgeIds,
    _seed: seed,
    _limit: max,
    _offset: 0,
    _city_ids: cityIds,
  });
  if (error || !data) return { videos: [], total: 0, seed };

  const rows = data as any[];
  const videos: VideoFeedItem[] = rows.map((r) => ({
    id: String(r.id),
    url: String(r.url),
    title: r.title || null,
    description: r.description || null,
    price: r.price || null,
    thumbnailUrl: r.thumbnail_url || null,
    isGeneric: !!r.is_generic,
    businessId: r.business_id ? String(r.business_id) : null,
    businessName: r.business_name || null,
    social: r.social_platform && r.social_account
      ? { platform: r.social_platform, account: String(r.social_account).replace(/^@+/, ""), url: r.social_url || null }
      : null,
  }));
  const total = rows.length ? Number(rows[0].total_count ?? rows.length) : 0;
  return { videos, total, seed };
}

/**
 * Repli legacy : vidéos des établissements épinglés (aucun badge sur l'entrée).
 * Ordre : vidéos internes puis génériques.
 */
export async function loadVideoFeed(
  admin: any,
  opts: { badgeIds: string[]; pinnedBusinessIds?: string[]; max?: number; city?: string | null },
): Promise<VideoFeedItem[]> {
  const max = opts.max ?? 30;
  // Périmètre géographique : la ville de l'établissement master (hôte) fait loi.
  // Vidéo interne → ville de la vidéo, à défaut ville de la fiche liée.
  // Vidéo générique → `generic_videos.city` ou liaison `generic_video_cities`.
  const cityFilter = normCity(opts.city);
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
      .select("id, business_id, name, description, price, url, youtube_video_url, instagram_video_url, tiktok_video_url, thumbnail_url, business_is_active, city")
      .in("id", docIds)
      .eq("type", "video");
  } else if (pinned.length) {
    // Aucun badge : on retombe sur les vidéos des établissements épinglés.
    docQuery = admin
      .from("business_documents")
      .select("id, business_id, name, description, price, url, youtube_video_url, instagram_video_url, tiktok_video_url, thumbnail_url, business_is_active, city")
      .in("business_id", pinned)
      .eq("type", "video");
  }

  if (docQuery) {
    const { data: docs } = await docQuery;
    const rows = (docs || []).filter((d: any) => d.business_is_active !== false);
    const bizIds = [...new Set(rows.map((d: any) => d.business_id).filter(Boolean))] as string[];
    const bizMap = new Map<string, string>();
    const bizCity = new Map<string, string>();
    if (bizIds.length) {
      const { data: bizs } = await admin.from("businesses").select("id, name, city").in("id", bizIds);
      for (const b of bizs || []) {
        bizMap.set(String(b.id), String(b.name));
        bizCity.set(String(b.id), normCity(b.city));
      }
    }
    for (const d of rows) {
      if (cityFilter) {
        const own = normCity(d.city);
        const linked = d.business_id ? bizCity.get(String(d.business_id)) || "" : "";
        const vidCity = own || linked;
        if (vidCity && vidCity !== cityFilter) continue;
      }
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
      // Villes liées (table de liaison) pour les génériques.
      const linkedCities = new Map<string, string[]>();
      if (cityFilter) {
        const { data: links } = await admin
          .from("generic_video_cities")
          .select("generic_video_id, cities(name_fr, name_en)")
          .in("generic_video_id", genIds);
        for (const l of links || []) {
          const k = String(l.generic_video_id);
          const arr = linkedCities.get(k) || [];
          for (const nm of [normCity((l as any)?.cities?.name_fr), normCity((l as any)?.cities?.name_en)]) {
            if (nm) arr.push(nm);
          }
          linkedCities.set(k, arr);
        }
      }
      const { data: gens } = await admin
        .from("generic_videos")
        .select("id, title, name, description, url, thumbnail_url, city")
        .in("id", genIds);
      for (const g of gens || []) {
        if (!g?.url) continue;
        if (cityFilter) {
          const own = normCity(g.city);
          const linked = linkedCities.get(String(g.id)) || [];
          const known = [own, ...linked].filter(Boolean);
          if (known.length && !known.includes(cityFilter)) continue;
        }
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

/**
 * Construit la réponse déterministe (texte court + payload marqueur).
 * Standard commun à toutes les suggestions/relances dont le mode est `video_feed` :
 *   1) tirage au sort + round-robin via `get_badges_video_feed` (seed par tour) ;
 *   2) annonce du nombre RÉEL de vidéos éligibles (pas la taille de la page) ;
 *   3) repli legacy sur les établissements épinglés si l'entrée n'a aucun badge.
 */
export async function buildVideoFeedAnswer(
  admin: any,
  opts: { badgeIds: string[]; pinnedBusinessIds?: string[]; label?: string | null; lang: Lang; max?: number; city?: string | null; seed?: string },
): Promise<VideoFeedAnswer | null> {
  const max = opts.max ?? 60;
  const badgeIds = (opts.badgeIds || []).filter(Boolean);

  let videos: VideoFeedItem[] = [];
  let total = 0;
  let seed = opts.seed || "";

  if (badgeIds.length) {
    const loaded = await loadBadgeVideoFeed(admin, { badgeIds, max, city: opts.city ?? null, seed: opts.seed });
    videos = loaded.videos;
    total = loaded.total;
    seed = loaded.seed;
  }
  if (!videos.length) {
    videos = await loadVideoFeed(admin, {
      badgeIds,
      pinnedBusinessIds: opts.pinnedBusinessIds,
      max,
      city: opts.city ?? null,
    });
    total = videos.length;
  }
  if (!videos.length) return null;

  const lang = opts.lang;
  const label = (opts.label || "").trim();
  const n = Math.max(total, videos.length);
  const head = label ? `**${label}**\n\n` : "";
  const text =
    lang === "en"
      ? `${head}${n} vertical video${n > 1 ? "s" : ""} available, shuffled at random. Tap a thumbnail to open the player, then swipe up or down to move through the feed.`
      : lang === "ar"
        ? `${head}${n} فيديو عمودي متاح، بترتيب عشوائي. اضغط على صورة مصغّرة لفتح المشغّل، ثم اسحب لأعلى أو لأسفل للتنقل.`
        : `${head}${n} vidéo${n > 1 ? "s" : ""} verticale${n > 1 ? "s" : ""} disponible${n > 1 ? "s" : ""}, tirées au sort. Clique sur une miniature pour ouvrir le lecteur, puis fais défiler verticalement pour passer à la suivante.`;

  return {
    text,
    payload: { title: label || null, videos, total: n, badgeIds, seed: seed || undefined },
    count: n,
    route: "video_feed",
  };
}


/** Sérialise le marqueur front (échappe `-->` comme les autres marqueurs). */
export function videoFeedMarker(payload: VideoFeedAnswer["payload"]): string {
  const safe = JSON.stringify(payload).replace(/-->/g, "--&gt;");
  return `\n\n<!--VIDEO_FEED:${safe}-->`;
}
