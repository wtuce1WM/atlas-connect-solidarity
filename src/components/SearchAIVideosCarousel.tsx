import { useEffect, useState, useMemo } from "react";
import { Play, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface VideoDoc {
  id: string;
  business_id: string | null;
  thumbnail_url: string | null;
  url: string | null;
  name: string | null;
  sort_order: number | null;
  businessName?: string | null;
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
          .select("id, url, thumbnail_url, business_id, name, sort_order, subcategory_id, service_id")
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
      }));

      // 6. Add generic_videos linked to selected subcategories + current city
      const genericItems: typeof docItems = [];
      const seenUrls = new Set<string>(docItems.map((d) => d.url).filter(Boolean));
      const genericBizByGv = new Map<string, string>();
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
              .select("id, url, name, title, thumbnail_url, sort_order")
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
              genericItems.push({
                id: v.id,
                url: v.url,
                thumbnail_url: v.thumbnail_url,
                business_id: genericBizByGv.get(v.id) || null,
                name: v.title || v.name || null,
                sort_order: v.sort_order ?? null,
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
              });
            });
          }
        }
      }

      // 8. Fetch business names for all items
      const merged = [...docItems, ...genericItems, ...ytItems];
      const bizIds = [...new Set(merged.map((d) => d.business_id).filter(Boolean))] as string[];
      const nameMap = new Map<string, string>();
      if (bizIds.length > 0) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id, name")
          .in("id", bizIds);
        (biz || []).forEach((b: any) => nameMap.set(b.id, b.name));
      }
      if (cancelled) return;
      setEntryId(resolvedEntryId);
      setSubIds(resolvedSubIds);
      setDocs(
        merged.map((d) => ({
          id: d.id,
          url: d.url,
          thumbnail_url: d.thumbnail_url,
          business_id: d.business_id,
          name: d.name,
          sort_order: d.sort_order,
          businessName: (d.business_id && nameMap.get(d.business_id)) || d.name || null,
        }))
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

  const handleClick = (doc: VideoDoc) => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (entryId) params.set("entry", entryId);
    if (subIds.length === 1) params.set("sub", subIds[0]);
    params.set("openVideo", doc.id);
    navigate(`/videos?${params.toString()}`);
  };

  return (
    <div className="mt-6 space-y-2">

      <div className="-mx-4 sm:mx-0">
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-3 [scrollbar-width:thin]">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleClick(doc)}
              className="group relative flex-shrink-0 w-40 rounded-xl overflow-hidden bg-muted ring-1 ring-border hover:ring-gold transition"
              style={{ aspectRatio: "6 / 9" }}
              title={doc.businessName || doc.name || ""}
            >
              <img
                src={doc.thumbnail_url!}
                alt={doc.businessName || doc.name || ""}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
              </div>
              {doc.businessName && (
                <p className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[11px] leading-tight text-white font-medium bg-gradient-to-t from-black/85 to-transparent line-clamp-2 text-left">
                  {doc.businessName}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchAIVideosCarousel;
