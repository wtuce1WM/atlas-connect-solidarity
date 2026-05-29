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

  useEffect(() => {
    let cancelled = false;
    const names = [...new Set(subcategoryNames)].filter(Boolean);
    if (names.length === 0 || !city) {
      setDocs([]);
      setEntryId(null);
      setSubIds([]);
      return;
    }
    setLoading(true);
    (async () => {
      // 1. Resolve subcategory IDs
      const { data: subs } = await supabase
        .from("subcategories")
        .select("id, name_fr")
        .in("name_fr", names);
      const resolvedSubIds = (subs || []).map((s: any) => s.id);
      if (resolvedSubIds.length === 0) {
        if (!cancelled) { setDocs([]); setLoading(false); }
        return;
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
      const uniqueCityDocIds = [...new Set(cityDocIds)];
      if (uniqueCityDocIds.length === 0) {
        if (!cancelled) { setDocs([]); setLoading(false); }
        return;
      }

      // 5. Fetch matching video docs (filtered to those doc ids)
      const all: any[] = [];
      for (let i = 0; i < uniqueCityDocIds.length; i += CHUNK) {
        const chunk = uniqueCityDocIds.slice(i, i + CHUNK);
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, name, sort_order, subcategory_id")
          .eq("type", "video")
          .eq("business_is_active", true)
          .in("subcategory_id", resolvedSubIds)
          .in("id", chunk)
          .not("thumbnail_url", "is", null)
          .not("url", "is", null)
          .order("sort_order", { ascending: true });
        if (data) all.push(...data);
      }

      // Group by business_id, keep first (lowest sort_order) per business
      all.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const perBiz = new Map<string, any>();
      for (const d of all) {
        if (!d.business_id) continue;
        if (!perBiz.has(d.business_id)) perBiz.set(d.business_id, d);
      }
      const grouped = Array.from(perBiz.values());

      // Fetch business names
      const bizIds = grouped.map((d) => d.business_id).filter(Boolean) as string[];
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
        grouped.map((d) => ({
          id: d.id,
          url: d.url,
          thumbnail_url: d.thumbnail_url,
          business_id: d.business_id,
          name: d.name,
          sort_order: d.sort_order,
          businessName: nameMap.get(d.business_id) || null,
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [subKey, city, entryLabel]);

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
      <h3
        className="text-sm font-semibold text-foreground tracking-wide px-1"
        style={{ fontFamily: "'Josefin Sans', sans-serif" }}
      >
        {title || (language === "en" ? "Videos" : language === "ar" ? "فيديوهات" : "Vidéos")}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{docs.length}</span>
      </h3>
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
