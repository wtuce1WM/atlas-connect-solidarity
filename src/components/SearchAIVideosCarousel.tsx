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
  description: string | null;
  sort_order: number | null;
  businessName?: string | null;
}

interface Props {
  /** Business IDs from the current AI/Results pool — drives 1 vignette per business. */
  businessIds: string[];
  /** Effective city (e.g. "Marrakech"). Passed to /videos so context restores. */
  city: string | null;
  /** Optional title override. */
  title?: string;
}

/**
 * Carousel of videos matching the current AI search context (city + businesses
 * present in results). One vignette = one business = exactly one video.
 * Clicking navigates to /videos?city=…&openVideo=<docId> which opens that
 * exact video in the SlidePanelHome.
 */
const SearchAIVideosCarousel = ({ businessIds, city, title }: Props) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const key = useMemo(() => [...new Set(businessIds)].sort().join(","), [businessIds]);

  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set(businessIds)].filter(Boolean);
    if (ids.length === 0) {
      setDocs([]);
      return;
    }
    setLoading(true);
    (async () => {
      const all: any[] = [];
      const CHUNK = 200;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, thumbnail_url, business_id, name, description, sort_order")
          .eq("type", "video")
          .eq("business_is_active", true)
          .eq("show_on_front", true)
          .in("business_id", chunk)
          .not("thumbnail_url", "is", null)
          .not("url", "is", null)
          .order("sort_order", { ascending: true });
        if (data) all.push(...data);
      }
      // Group by business_id, keep first (lowest sort_order) per business
      const perBiz = new Map<string, any>();
      for (const d of all) {
        if (!d.business_id) continue;
        if (!perBiz.has(d.business_id)) perBiz.set(d.business_id, d);
      }
      const grouped = Array.from(perBiz.values());

      // Fetch business names for label
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
      setDocs(
        grouped.map((d) => ({
          ...d,
          businessName: nameMap.get(d.business_id) || null,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

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
