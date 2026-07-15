import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Video item used to inject hashtag-tagged videos into the BookOnlineSlidePanel
 * prev/next flow on Search results. Shape mirrors the props consumed by the
 * VideoSlidePanel delegation in BookOnlineSlidePanel (see line ~2879).
 */
export type InjectedHashtagVideo = {
  videoUrl: string;
  videoId: string | null;
  isGeneric: boolean;
  owner: { id: string; name: string; logo_url: string | null; logo_bg: string | null } | null;
  pageBusinessId: string | null;
  pageBusinessName: string | null;
  videoName: string | null;
  social:
    | { platform: "instagram" | "tiktok" | "youtube"; account: string; url: string }
    | null;
  badgeLabel: string;
};

const HASHTAGS = ["#Annonce", "#Agenda", "#Culture", "#Tips", "#Vlogs"] as const;

/**
 * Whitelist des comptes externes autorisés à apparaître dans le feed hashtag
 * SANS être rattachés à un business (`generic_video_businesses` vide).
 * Tout autre compte orphelin est filtré pour éviter que le feed soit noyé
 * par des chaînes médias / créateurs non éditorialisés.
 * Règle complémentaire : pour ces comptes, on n'accepte QUE les Shorts
 * (URLs hors `youtube.com/watch`). Les vidéos longues YouTube sont ignorées.
 */
const EXTERNAL_ACCOUNT_WHITELIST = new Set<string>([
  "tarikbelasri",
  "lesgourmandisesdeloubna5154",
]);

function isYoutubeLongFormat(url: string): boolean {
  return /youtube\.com\/watch/i.test(url);
}

/**
 * Fetches videos tagged with the 5 editorial hashtags, then interleaves them
 * round-robin so the resulting array alternates badges:
 *   annonce → agenda → culture → tips → vlogs → annonce → …
 * Empty buckets are skipped automatically.
 */
export function useHashtagInjectedVideos(cityName?: string | null): InjectedHashtagVideo[] {
  const [items, setItems] = useState<InjectedHashtagVideo[]>([]);
  const normalizedCity = (cityName || "").trim();
  const cityKey = normalizedCity && normalizedCity.toLowerCase() !== "all" ? normalizedCity : "";

  useEffect(() => {
    let cancelled = false;
    // Neutralisé : injection de vidéos hashtag/génériques désactivée dans
    // le carousel de /search. Réversible en supprimant ce return.
    return;
    (async () => {
      // 0. Resolve city id (strict city scoping). If no city → no geo filter.
      let cityId: string | null = null;
      if (cityKey) {
        const { data: cityRow } = await supabase
          .from("cities")
          .select("id")
          .or(`name_fr.ilike.${cityKey},name_en.ilike.${cityKey},name_ar.ilike.${cityKey}`)
          .limit(1)
          .maybeSingle();
        cityId = (cityRow as any)?.id || null;
      }


      // 1. Resolve badge IDs
      const { data: badges } = await supabase
        .from("badges")
        .select("id, name_fr")
        .in("name_fr", HASHTAGS as unknown as string[]);
      if (!badges?.length || cancelled) return;
      const badgeByLabel = new Map<string, string>();
      badges.forEach((b: any) => badgeByLabel.set(b.name_fr, b.id));

      // 2. Fetch video-badge links (yt + generic) for these badges in one go
      const allBadgeIds = Array.from(badgeByLabel.values());
      const [ytLinksRes, genLinksRes] = await Promise.all([
        supabase
          .from("business_youtube_video_badges")
          .select("badge_id, youtube_video_id")
          .in("badge_id", allBadgeIds),
        supabase
          .from("generic_video_badges")
          .select("badge_id, generic_video_id")
          .in("badge_id", allBadgeIds),
      ]);


      let ytIds = Array.from(
        new Set(((ytLinksRes.data as any[]) || []).map((l) => l.youtube_video_id).filter(Boolean)),
      );
      let genIds = Array.from(
        new Set(((genLinksRes.data as any[]) || []).map((l) => l.generic_video_id).filter(Boolean)),
      );

      // 2b. Strict city scoping: keep only video ids linked to the selected city.
      if (cityId) {
        const [ytCityRes, genCityRes] = await Promise.all([
          ytIds.length
            ? supabase
                .from("business_youtube_video_cities")
                .select("youtube_video_id")
                .in("youtube_video_id", ytIds)
                .eq("city_id", cityId)
            : Promise.resolve({ data: [] as any[] }),
          genIds.length
            ? supabase
                .from("generic_video_cities" as any)
                .select("generic_video_id")
                .in("generic_video_id", genIds)
                .eq("city_id", cityId)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const ytAllowed = new Set(((ytCityRes.data as any[]) || []).map((r: any) => r.youtube_video_id));
        const genAllowed = new Set(((genCityRes.data as any[]) || []).map((r: any) => r.generic_video_id));
        ytIds = ytIds.filter((id) => ytAllowed.has(id));
        genIds = genIds.filter((id) => genAllowed.has(id));
      }


      const [ytRes, genRes] = await Promise.all([
        ytIds.length
          ? supabase
              .from("business_youtube_videos")
              .select(
                "id, video_id, title, business_id, business_is_active, is_visible",
              )
              .in("id", ytIds)
              .eq("business_is_active", true)
              .eq("is_visible", true)
          : Promise.resolve({ data: [] as any[] }),
        genIds.length
          ? supabase
              .from("generic_videos" as any)
              .select(
                "id, url, name, title, description, instagram_account, tiktok_account, youtube_account",
              )
              .in("id", genIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // 3. Map generic_video → first owner business (if any)
      const firstOwnerByGeneric: Record<string, string> = {};
      if (genIds.length) {
        const { data: ownerLinks } = await supabase
          .from("generic_video_businesses" as any)
          .select("generic_video_id, business_id, sort_order")
          .in("generic_video_id", genIds)
          .order("sort_order", { ascending: true });
        ((ownerLinks as any[]) || []).forEach((l: any) => {
          if (!firstOwnerByGeneric[l.generic_video_id])
            firstOwnerByGeneric[l.generic_video_id] = l.business_id;
        });
      }

      // 4. Fetch owner businesses
      const bizIds = Array.from(
        new Set([
          ...((ytRes.data as any[]) || []).map((y: any) => y.business_id).filter(Boolean),
          ...Object.values(firstOwnerByGeneric).filter(Boolean),
        ]),
      );
      const bizMap: Record<string, any> = {};
      if (bizIds.length) {
        const { data: bizs } = await supabase
          .from("businesses")
          .select("id, name, logo_url, logo_bg, youtube_url")
          .in("id", bizIds);
        (bizs || []).forEach((b: any) => {
          bizMap[b.id] = b;
        });
      }

      // 5. Build per-badge buckets
      const buckets: Record<string, InjectedHashtagVideo[]> = {};
      HASHTAGS.forEach((label) => {
        buckets[label] = [];
      });

      const ytById = new Map<string, any>();
      ((ytRes.data as any[]) || []).forEach((y) => ytById.set(y.id, y));
      const genById = new Map<string, any>();
      ((genRes.data as any[]) || []).forEach((g) => genById.set(g.id, g));
      const labelByBadgeId = new Map<string, string>();
      badgeByLabel.forEach((id, label) => labelByBadgeId.set(id, label));

      ((ytLinksRes.data as any[]) || []).forEach((l: any) => {
        const y = ytById.get(l.youtube_video_id);
        const label = labelByBadgeId.get(l.badge_id);
        if (!y || !label || !y.business_id || !bizMap[y.business_id]) return;
        // Whitelist : seules les chaînes YT des comptes autorisés sont gardées.
        const handle = (bizMap[y.business_id]?.youtube_url || "")
          .match(/@([^/?#]+)/)?.[1]?.toLowerCase() || "";
        if (!handle || !EXTERNAL_ACCOUNT_WHITELIST.has(handle)) return;
        const owner = {
          id: y.business_id,
          name: bizMap[y.business_id]?.name || "",
          logo_url: bizMap[y.business_id]?.logo_url ?? null,
          logo_bg: bizMap[y.business_id]?.logo_bg ?? null,
        };
        buckets[label].push({
          videoUrl: `https://www.youtube.com/watch?v=${y.video_id}`,
          videoId: y.video_id,
          isGeneric: false,
          owner,
          pageBusinessId: y.business_id,
          pageBusinessName: owner.name,
          videoName: y.title || null,
          social: null,
          badgeLabel: label,
        });
      });

      ((genLinksRes.data as any[]) || []).forEach((l: any) => {
        const g = genById.get(l.generic_video_id);
        const label = labelByBadgeId.get(l.badge_id);
        if (!g || !label) return;
        // URL exploitable : url principale, sinon fallback sur les URLs de vidéo par plateforme.
        const effectiveUrl: string | null =
          g.url || g.instagram_video_url || g.tiktok_video_url || g.youtube_video_url || null;

        const ownerId = firstOwnerByGeneric[g.id] || null;
        const igAcc = (g.instagram_account || "").replace(/^@+/, "");
        const ttAcc = (g.tiktok_account || "").replace(/^@+/, "");
        const ytAcc = (g.youtube_account || "").replace(/^@+/, "");
        const social = igAcc
          ? { platform: "instagram" as const, account: igAcc, url: `https://www.instagram.com/${igAcc}` }
          : ttAcc
            ? { platform: "tiktok" as const, account: ttAcc, url: `https://www.tiktok.com/@${ttAcc}` }
            : ytAcc
              ? { platform: "youtube" as const, account: ytAcc, url: `https://www.youtube.com/@${ytAcc}` }
              : null;
        const account = igAcc || ttAcc || ytAcc;
        const owner = ownerId && bizMap[ownerId]
          ? {
              id: ownerId,
              name: bizMap[ownerId].name || "",
              logo_url: bizMap[ownerId].logo_url ?? null,
              logo_bg: bizMap[ownerId].logo_bg ?? null,
            }
          : (account
              ? { id: "", name: `@${account}`, logo_url: null, logo_bg: null }
              : null);

        // Filtre anti-spam : seules les vidéos YouTube de comptes whitelistés
        // sont acceptées. Les vidéos IG/TikTok/sans compte passent sans filtre.
        if (ytAcc && !EXTERNAL_ACCOUNT_WHITELIST.has(ytAcc.toLowerCase())) return;

        buckets[label].push({
          videoUrl: effectiveUrl,
          videoId: null,
          isGeneric: true,
          owner,
          pageBusinessId: ownerId,
          pageBusinessName: ownerId ? bizMap[ownerId]?.name || null : null,
          videoName: g.title || g.name || null,
          social,
          badgeLabel: label,
        });
      });

      // Shuffle each bucket so repeated visits feel fresh (stable within session),
      // puis priorise les vidéos génériques avant les vidéos YouTube.
      Object.values(buckets).forEach((arr) => {
        arr.sort(() => Math.random() - 0.5);
        arr.sort((a, b) => (a.isGeneric === b.isGeneric ? 0 : a.isGeneric ? -1 : 1));
      });

      // 6. Round-robin interleave: annonce → agenda → culture → tips → vlogs → …
      const out: InjectedHashtagVideo[] = [];
      const cursors: Record<string, number> = {};
      HASHTAGS.forEach((l) => (cursors[l] = 0));
      let stuck = 0;
      while (stuck < HASHTAGS.length) {
        stuck = 0;
        for (const label of HASHTAGS) {
          const bucket = buckets[label];
          const i = cursors[label];
          if (bucket && i < bucket.length) {
            out.push(bucket[i]);
            cursors[label] = i + 1;
          } else {
            stuck++;
          }
        }
      }

      if (!cancelled) setItems(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [cityKey]);

  return items;
}
