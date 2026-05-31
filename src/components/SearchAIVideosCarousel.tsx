import { useEffect, useState, useMemo } from "react";
import { Play, Loader2, Star, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import SlidePanelHome from "@/components/SlidePanelHome";
import { InstagramIcon } from "@/components/staff/SocialMediaIcons";
import { TikTokIcon as SiTiktok } from "@/components/icons/TikTokIcon";


type SocialInfo = { platform: "instagram" | "tiktok" | "youtube"; account: string; url: string | null };

interface VideoDoc {
  id: string;
  business_id: string | null;
  thumbnail_url: string | null;
  url: string | null;
  name: string | null;
  sort_order: number | null;
  price_type?: string | null;
  subcategory_id?: string | null;
  service_id?: string | null;
  businessName?: string | null;
  subcategoryLabel?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  logoUrl?: string | null;
  social?: SocialInfo | null;
  isGeneric?: boolean;
}


interface Props {
  /** Selected subcategory names (subcats=A|B|...). */
  subcategoryNames: string[];
  /** Effective city (e.g. "Marrakech"). */
  city: string | null;
  /** Front-structure entry label (e.g. "Hébergement"). */
  entryLabel?: string | null;
  /** Optional service name filter (matches business_documents.service_id). */
  serviceName?: string | null;
  /** Optional badge IDs (intersect with business_document_badges). */
  badgeIds?: string[];
  /** Optional title override. */
  title?: string;
  /** When provided, internal videos (business_documents) open the business panel instead of SlidePanelHome. */
  onOpenBusiness?: (b: { id: string; name: string }) => void;
}

/**
 * Carousel mirroring the /videos page filter for the current search context:
 *   subcategory_id ∈ resolved(subcategoryNames)  (when provided)
 *   AND service_id = resolved(serviceName)        (when provided)
 *   AND id ∈ business_document_badges.document_id (when badgeIds provided)
 *   AND business_document_cities matching the current city (+ aliases)
 *
 * Rule "1 entité = 1 vignette" → group by business_id, keep the first video
 * (lowest sort_order). Clicking a vignette opens that exact video on /videos
 * within the same context (city + entry + sub).
 */
const SearchAIVideosCarousel = ({ subcategoryNames, city, entryLabel, serviceName, badgeIds, title }: Props) => {
  const { language } = useLanguage();

  const navigate = useNavigate();
  const [docs, setDocs] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [subIds, setSubIds] = useState<string[]>([]);
  const [panelVideo, setPanelVideo] = useState<{
    videoUrl: string;
    videoId: string;
    videoName: string | null;
    businessName: string;
    isGeneric: boolean;
    description: string | null;
    owner: { id: string; name: string; logo_url: string | null; logo_bg?: string | null } | null;
    social: { platform: "instagram" | "tiktok" | "youtube"; account: string; url: string | null } | null;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);



  const subKey = useMemo(
    () => [...new Set(subcategoryNames)].sort().join("|"),
    [subcategoryNames]
  );
  const badgeKey = useMemo(
    () => [...new Set(badgeIds || [])].sort().join("|"),
    [badgeIds]
  );

  useEffect(() => {
    let cancelled = false;
    const names = [...new Set(subcategoryNames)].filter(Boolean);
    const hasSub = names.length > 0;
    const hasService = !!serviceName;
    const hasBadges = (badgeIds || []).length > 0;
    if ((!hasSub && !hasService && !hasBadges) || !city) {
      setDocs([]);
      setEntryId(null);
      setSubIds([]);
      return;
    }
    setLoading(true);
    (async () => {
      // 1. Resolve subcategory IDs (if any)
      let resolvedSubIds: string[] = [];
      if (hasSub) {
        const { data: subs } = await supabase
          .from("subcategories")
          .select("id, name_fr")
          .in("name_fr", names);
        resolvedSubIds = (subs || []).map((s: any) => s.id);
        if (resolvedSubIds.length === 0) {
          if (!cancelled) { setDocs([]); setLoading(false); }
          return;
        }
      }

      // 1b. Resolve service ID (if any)
      let resolvedServiceId: string | null = null;
      if (hasService) {
        const { data: svcs } = await supabase
          .from("services")
          .select("id, name_fr")
          .eq("name_fr", serviceName)
          .limit(1);
        if (svcs && svcs.length > 0) resolvedServiceId = (svcs[0] as any).id;
        if (!resolvedServiceId) {
          if (!cancelled) { setDocs([]); setLoading(false); }
          return;
        }
      }

      // 2. Resolve current city IDs (Marrakech aliases Agafay)
      const aliasNames = city === "Marrakech" ? ["Marrakech", "Agafay"] : [city];
      const { data: cityRows } = await supabase
        .from("cities")
        .select("id, name_fr")
        .in("name_fr", aliasNames);
      const cityIds = (cityRows || []).map((c: any) => c.id);
      if (cityIds.length === 0) {
        if (!cancelled) { setDocs([]); setLoading(false); }
        return;
      }

      // 3. Resolve front_structure entry id from label (for nav back to /videos)
      let resolvedEntryId: string | null = null;
      if (entryLabel) {
        const { data: ent } = await supabase
          .from("front_structure" as any)
          .select("id, name")
          .ilike("name", entryLabel)
          .limit(1);
        if (ent && (ent as any[]).length > 0) resolvedEntryId = (ent as any[])[0].id;
      }

      // 4. Doc IDs linked to current city
      const cityDocIds: string[] = [];
      const CHUNK = 300;
      for (let i = 0; i < cityIds.length; i += CHUNK) {
        const { data } = await supabase
          .from("business_document_cities" as any)
          .select("document_id")
          .in("city_id", cityIds.slice(i, i + CHUNK));
        (data as any[] || []).forEach((r) => cityDocIds.push(r.document_id));
      }
      let candidateDocIds = [...new Set(cityDocIds)];
      if (candidateDocIds.length === 0) {
        if (!cancelled) { setDocs([]); setLoading(false); }
        return;
      }

      // 4b. Intersect with badge-linked doc IDs (if any)
      if (hasBadges) {
        const badgeDocIds: string[] = [];
        const { data } = await supabase
          .from("business_document_badges" as any)
          .select("document_id")
          .in("badge_id", badgeIds!);
        (data as any[] || []).forEach((r) => badgeDocIds.push(r.document_id));
        const badgeSet = new Set(badgeDocIds);
        candidateDocIds = candidateDocIds.filter((id) => badgeSet.has(id));
        if (candidateDocIds.length === 0) {
          if (!cancelled) { setDocs([]); setLoading(false); }
          return;
        }
      }

      // 5. Fetch matching video docs from business_documents
      const all: any[] = [];
      for (let i = 0; i < candidateDocIds.length; i += CHUNK) {
        const chunk = candidateDocIds.slice(i, i + CHUNK);
        let q = supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, name, sort_order, subcategory_id, service_id, price_type")
          .eq("type", "video")
          .eq("business_is_active", true)
          .in("id", chunk)
          .not("thumbnail_url", "is", null)
          .not("url", "is", null)
          .order("sort_order", { ascending: true });
        if (resolvedSubIds.length > 0) q = q.in("subcategory_id", resolvedSubIds);
        if (resolvedServiceId) q = q.eq("service_id", resolvedServiceId);
        const { data } = await q;
        if (data) all.push(...data);
      }

      // Group business_documents by business_id (1 entité = 1 vignette)
      all.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const perBiz = new Map<string, any>();
      for (const d of all) {
        if (!d.business_id) continue;
        if (!perBiz.has(d.business_id)) perBiz.set(d.business_id, d);
      }
      const docItems = Array.from(perBiz.values()).map((d) => ({
        id: d.id as string,
        url: d.url as string,
        thumbnail_url: d.thumbnail_url as string,
        business_id: d.business_id as string | null,
        name: d.name as string | null,
        sort_order: d.sort_order as number | null,
        price_type: (d.price_type as string | null) ?? null,
        subcategory_id: (d.subcategory_id as string | null) ?? null,
        service_id: (d.service_id as string | null) ?? null,
      }));


      // 6. Add generic_videos linked to selected subcategories + current city
      const genericItems: typeof docItems = [];
      const seenUrls = new Set<string>(docItems.map((d) => d.url).filter(Boolean));
      const genericBizByGv = new Map<string, string>();
      const socialByGv = new Map<string, SocialInfo>();
      if (resolvedSubIds.length > 0) {
        const { data: gvSubLinks } = await supabase
          .from("generic_video_subcategories" as any)
          .select("generic_video_id")
          .in("subcategory_id", resolvedSubIds);
        const gvIds = [...new Set(((gvSubLinks as any[]) || []).map((l: any) => l.generic_video_id))];
        if (gvIds.length > 0) {
          const gvCityIds = new Set<string>();
          for (let i = 0; i < gvIds.length; i += CHUNK) {
            const { data } = await supabase
              .from("generic_video_cities" as any)
              .select("generic_video_id")
              .in("city_id", cityIds)
              .in("generic_video_id", gvIds.slice(i, i + CHUNK));
            (data as any[] || []).forEach((r) => gvCityIds.add(r.generic_video_id));
          }
          if (gvCityIds.size > 0) {
            const gvIdsArr = Array.from(gvCityIds);
            const { data: gvs } = await supabase
              .from("generic_videos" as any)
              .select("id, url, name, title, thumbnail_url, sort_order, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url")
              .in("id", gvIdsArr)
              .not("thumbnail_url", "is", null)
              .not("url", "is", null)
              .order("sort_order", { ascending: true });
            const { data: gvBiz } = await supabase
              .from("generic_video_businesses" as any)
              .select("generic_video_id, business_id")
              .in("generic_video_id", gvIdsArr);
            ((gvBiz as any[]) || []).forEach((l: any) => {
              if (!genericBizByGv.has(l.generic_video_id)) genericBizByGv.set(l.generic_video_id, l.business_id);
            });
            ((gvs as any[]) || []).forEach((v: any) => {
              if (!v.url || seenUrls.has(v.url)) return;
              seenUrls.add(v.url);
              let social: SocialInfo | null = null;
              if (v.instagram_account) social = { platform: "instagram", account: String(v.instagram_account).replace(/^@/, ""), url: v.instagram_url ?? null };
              else if (v.tiktok_account) social = { platform: "tiktok", account: String(v.tiktok_account).replace(/^@/, ""), url: v.tiktok_url ?? null };
              else if (v.youtube_account) social = { platform: "youtube", account: String(v.youtube_account).replace(/^@/, ""), url: v.youtube_url ?? null };
              if (social) socialByGv.set(v.id, social);
              genericItems.push({
                id: v.id,
                url: v.url,
                thumbnail_url: v.thumbnail_url,
                business_id: genericBizByGv.get(v.id) || null,
                name: v.title || v.name || null,
                sort_order: v.sort_order ?? null,
                price_type: null,
                subcategory_id: null,
                service_id: null,
              });
            });
          }
        }
      }

      // 7. Add business_youtube_videos linked to selected subcategories + current city
      const ytItems: typeof docItems = [];
      if (resolvedSubIds.length > 0) {
        const { data: ytSubLinks } = await supabase
          .from("business_youtube_video_subcategories" as any)
          .select("youtube_video_id")
          .in("subcategory_id", resolvedSubIds);
        const ytIds = [...new Set(((ytSubLinks as any[]) || []).map((l: any) => l.youtube_video_id))];
        if (ytIds.length > 0) {
          const ytCityIds = new Set<string>();
          for (let i = 0; i < ytIds.length; i += CHUNK) {
            const { data } = await supabase
              .from("business_youtube_video_cities" as any)
              .select("youtube_video_id")
              .in("city_id", cityIds)
              .in("youtube_video_id", ytIds.slice(i, i + CHUNK));
            (data as any[] || []).forEach((r) => ytCityIds.add(r.youtube_video_id));
          }
          if (ytCityIds.size > 0) {
            const { data: yts } = await supabase
              .from("business_youtube_videos")
              .select("id, video_id, title, thumbnail, custom_thumbnail_url, is_short, is_visible, sort_order, business_id")
              .eq("is_visible", true)
              .eq("business_is_active", true)
              .in("id", Array.from(ytCityIds))
              .order("sort_order", { ascending: true });
            ((yts as any[]) || []).forEach((y: any) => {
              const url = y.is_short
                ? `https://www.youtube.com/shorts/${y.video_id}`
                : `https://www.youtube.com/watch?v=${y.video_id}`;
              if (seenUrls.has(url)) return;
              const thumb = y.custom_thumbnail_url || y.thumbnail || `https://img.youtube.com/vi/${y.video_id}/hqdefault.jpg`;
              if (!thumb) return;
              seenUrls.add(url);
              ytItems.push({
                id: y.id,
                url,
                thumbnail_url: thumb,
                business_id: y.business_id,
                name: y.title || null,
                sort_order: y.sort_order ?? null,
                price_type: null,
                subcategory_id: null,
                service_id: null,
              });
            });
          }
        }
      }

      // 8. Fetch business names, ratings, logos + subcategory labels
      const merged = [...docItems, ...genericItems, ...ytItems];
      const bizIds = [...new Set(merged.map((d) => d.business_id).filter(Boolean))] as string[];
      const bizMap = new Map<string, any>();
      if (bizIds.length > 0) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id, name, computed_rating, rating, total_review_count, logo_url")
          .in("id", bizIds);
        (biz || []).forEach((b: any) => bizMap.set(b.id, b));
      }
      const subIdsForLabels = [...new Set(merged.map((d) => d.subcategory_id).filter(Boolean))] as string[];
      const subLabelMap = new Map<string, string>();
      if (subIdsForLabels.length > 0) {
        const { data: subs } = await supabase
          .from("subcategories")
          .select("id, name_fr")
          .in("id", subIdsForLabels);
        (subs || []).forEach((s: any) => subLabelMap.set(s.id, s.name_fr));
      }
      if (cancelled) return;
      setEntryId(resolvedEntryId);
      setSubIds(resolvedSubIds);
      setDocs(
        merged.map((d) => {
          const b = d.business_id ? bizMap.get(d.business_id) : null;
          const social = socialByGv.get(d.id) || null;
          const isGeneric = socialByGv.has(d.id) || (!b && genericBizByGv.has(d.id) === false && !d.subcategory_id && !d.service_id && !d.price_type && genericItems.some((g) => g.id === d.id));
          return {
            id: d.id,
            url: d.url,
            thumbnail_url: d.thumbnail_url,
            business_id: d.business_id,
            name: d.name,
            sort_order: d.sort_order,
            price_type: d.price_type ?? null,
            subcategory_id: d.subcategory_id ?? null,
            service_id: d.service_id ?? null,
            businessName: (b?.name) || d.name || null,
            subcategoryLabel: d.subcategory_id ? subLabelMap.get(d.subcategory_id) || null : null,
            rating: b ? (b.computed_rating ?? b.rating ?? null) : null,
            reviewCount: b?.total_review_count ?? null,
            logoUrl: b?.logo_url ?? null,
            social,
            isGeneric: genericItems.some((g) => g.id === d.id),
          };
        })
      );
      setLoading(false);


    })();
    return () => {
      cancelled = true;
    };
  }, [subKey, city, entryLabel, serviceName, badgeKey]);


  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (docs.length === 0) return null;

  const handleClick = async (doc: VideoDoc) => {
    if (!doc.url) return;
    // Try business_documents first (covers most cases)
    const { data: bizDoc } = await supabase
      .from("business_documents")
      .select("id, url, business_id, name, description")
      .eq("id", doc.id)
      .maybeSingle();
    const isGeneric = !bizDoc;
    let description: string | null = (bizDoc as any)?.description ?? null;
    // Resolve owner business (for logo + name)
    let owner: { id: string; name: string; logo_url: string | null; logo_bg?: string | null } | null = null;
    const ownerId = doc.business_id;
    if (ownerId) {
      const { data: b } = await supabase
        .from("businesses")
        .select("id, name, logo_url, logo_bg")
        .eq("id", ownerId)
        .maybeSingle();
      if (b) owner = { id: (b as any).id, name: (b as any).name, logo_url: (b as any).logo_url ?? null, logo_bg: (b as any).logo_bg ?? null };
    }
    // If generic video, fetch instagram/tiktok/youtube account info for social badge
    let social: { platform: "instagram" | "tiktok" | "youtube"; account: string; url: string | null } | null = null;
    if (isGeneric) {
      const { data: gv } = await supabase
        .from("generic_videos" as any)
        .select("instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url")
        .eq("id", doc.id)
        .maybeSingle();
      const g: any = gv;
      if (g?.instagram_account) social = { platform: "instagram", account: String(g.instagram_account).replace(/^@/, ""), url: g.instagram_url ?? null };
      else if (g?.tiktok_account) social = { platform: "tiktok", account: String(g.tiktok_account).replace(/^@/, ""), url: g.tiktok_url ?? null };
      else if (g?.youtube_account) social = { platform: "youtube", account: String(g.youtube_account).replace(/^@/, ""), url: g.youtube_url ?? null };
    }
    setCurrentTime(0);
    setPanelVideo({
      videoUrl: doc.url,
      videoId: doc.id,
      videoName: doc.name,
      businessName: doc.businessName || owner?.name || "—",
      isGeneric,
      description,
      owner,
      social,
    });
  };


  return (
    <>
    <div className="mt-6 space-y-2">


      <div className="-mx-4 sm:mx-0">
        <div className="flex gap-4 overflow-x-auto px-4 sm:px-0 pb-3 [scrollbar-width:thin]">
          {docs.map((doc) => {
            const priceTypeLabel = doc.price_type
              ? (doc.price_type.toLowerCase() === "location"
                  ? "Location"
                  : doc.price_type.toLowerCase() === "vente"
                    ? "Vente"
                    : doc.price_type)
              : null;
            const textShadow = "drop-shadow(0 1px 2px hsla(0,0%,0%,0.95)) drop-shadow(0 2px 6px hsla(0,0%,0%,0.7))";
            return (
              <button
                key={doc.id}
                onClick={() => handleClick(doc)}
                className="group relative flex-shrink-0 w-72 rounded-xl overflow-hidden bg-muted ring-1 ring-border hover:ring-gold transition"
                style={{ aspectRatio: "6 / 9" }}
                title={doc.businessName || doc.name || ""}
              >
                <img
                  src={doc.thumbnail_url!}
                  alt={doc.businessName || doc.name || ""}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors" />

                {/* Top-left: business name + subcategory label (hidden for generic videos with social) */}
                {!doc.social && (doc.businessName || doc.subcategoryLabel) && (
                  <div className="absolute top-0 left-0 right-0 p-2.5 space-y-0.5 z-[5] text-left pointer-events-none">
                    {doc.businessName && (
                      <p
                        className="text-[13px] font-semibold uppercase text-white line-clamp-1 tracking-wide"
                        style={{ fontFamily: "'Josefin Sans', sans-serif", filter: textShadow }}
                      >
                        {doc.businessName}
                      </p>
                    )}
                    {doc.subcategoryLabel && (
                      <p
                        className="text-[11px] font-bold uppercase tracking-wide text-gold line-clamp-1"
                        style={{ filter: textShadow }}
                      >
                        {doc.subcategoryLabel}
                      </p>
                    )}
                  </div>
                )}

                {/* Video title (centered, top) */}
                {doc.name && (
                  <div className="absolute inset-x-0 top-[8%] z-[6] flex justify-center px-3 pointer-events-none">
                    <p
                      className="text-[13px] font-bold text-white text-center line-clamp-3"
                      style={{ fontFamily: "'Roboto', sans-serif", filter: textShadow }}
                    >
                      {doc.name}
                    </p>
                  </div>
                )}

                {/* Gold price-type badge (Location/Vente) */}
                {priceTypeLabel && (
                  <div className="absolute inset-x-0 top-[34%] z-[7] flex justify-center pointer-events-none">
                    <span className="px-3 py-1 rounded-md bg-gold text-black text-[11px] font-bold uppercase tracking-wide shadow-lg border-2 border-black">
                      {priceTypeLabel}
                    </span>
                  </div>
                )}

                {/* Play button center */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center shadow-lg">
                    <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* Logo (bottom center) */}
                {doc.logoUrl && (
                  <div className="absolute inset-x-0 bottom-[14%] z-[5] flex justify-center px-3 pointer-events-none">
                    <img
                      src={doc.logoUrl}
                      alt=""
                      className="max-h-[60px] max-w-[90px] object-contain"
                      style={{ filter: "drop-shadow(0 0 2px hsla(0,0%,0%,0.8)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))" }}
                    />
                  </div>
                )}

                {/* Social badge (Instagram/TikTok/YouTube) for generic videos without logo */}
                {doc.social && !doc.logoUrl && doc.social.account && (
                  <div className="absolute inset-x-0 bottom-[12%] z-[6] flex flex-col items-center justify-center gap-2 px-2 pointer-events-none">
                    {doc.social.platform === "instagram" && <InstagramIcon className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                    {doc.social.platform === "tiktok" && <SiTiktok className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                    {doc.social.platform === "youtube" && <Youtube className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                    <div className="flex items-center rounded-full bg-black border border-white/15 px-3 py-1.5">
                      <span className="text-xs font-medium text-white normal-case tracking-normal" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: 0 }}>
                        Follow @{doc.social.account}
                      </span>
                    </div>
                  </div>
                )}

                {/* Rating bottom-left (hidden for generic videos with social) */}
                {!doc.social && doc.rating != null && (
                  <div className="absolute bottom-2 left-2 z-[5] inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm">
                    <Star className="h-3 w-3 text-gold fill-gold" />
                    <span className="font-medium text-white">{doc.rating}/20</span>
                    {(doc.reviewCount ?? 0) > 0 && (
                      <span className="text-white/80">· {doc.reviewCount} avis</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
    {panelVideo && (
      <SlidePanelHome
        open={!!panelVideo}
        onClose={() => setPanelVideo(null)}
        videoUrl={panelVideo.videoUrl}
        videoId={panelVideo.videoId}
        videoName={panelVideo.videoName}
        businessName={panelVideo.businessName}
        isGeneric={panelVideo.isGeneric}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        owner={panelVideo.owner}
        description={panelVideo.description}
        social={panelVideo.social}
        showSocialBadge={!!panelVideo.social}
      />
    )}
    </>
  );

};

export default SearchAIVideosCarousel;
