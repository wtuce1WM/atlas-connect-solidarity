// Carte embarquable d'un article de blog : /embed/article-map/:slug?bg=EFE6D8&anchor=<slug|uuid>
// Mêmes marqueurs que la carte pleine largeur de /blog/:slug (aucun fork : PoiGoogleMap réutilisé).
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";

interface Biz {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  neighborhood: string | null;
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  computed_rating: number | null;
  total_review_count: number | null;
}

const FIELDS =
  "id, name, slug, city, neighborhood, images, latitude, longitude, computed_rating, total_review_count";

const EmbedArticleMap = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const [items, setItems] = useState<Biz[]>([]);
  const [anchor, setAnchor] = useState<Biz | null>(null);

  const bgParam = (params.get("bg") || "").replace(/^#/, "");
  const baseColor = /^[0-9a-fA-F]{6}$/.test(bgParam) ? `#${bgParam}` : null;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data: post } = await supabase
        .from("blog_posts")
        .select("entries_fr, anchor_business_id")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled || !post) return;
      const raw = Array.isArray((post as any).entries_fr) ? ((post as any).entries_fr as any[]) : [];
      const ids = Array.from(
        new Set(raw.flatMap((e) => [e?.id, ...((e?.extraIds as string[]) ?? [])]).filter(Boolean)),
      ) as string[];
      const anchorId = (post as any).anchor_business_id as string | null;
      if (ids.length) {
        const { data } = await supabase.from("businesses").select(FIELDS).in("id", ids);
        if (!cancelled && data) setItems(data as unknown as Biz[]);
      }
      if (anchorId) {
        const { data } = await supabase.from("businesses").select(FIELDS).eq("id", anchorId).maybeSingle();
        if (!cancelled && data) setAnchor(data as unknown as Biz);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const bySlug = useMemo(() => {
    const m: Record<string, string> = {};
    items.forEach((b) => { if (b.slug) m[b.id] = b.slug; });
    if (anchor?.slug) m[anchor.id] = anchor.slug;
    return m;
  }, [items, anchor]);

  const pois = useMemo<PoiMapItem[]>(() => {
    const list: PoiMapItem[] = items
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => ({
        id: b.id,
        name: b.name,
        latitude: b.latitude,
        longitude: b.longitude,
        images: b.images,
        city: b.city,
        neighborhood: b.neighborhood,
        avgOn20: b.computed_rating,
        totalReviews: b.total_review_count ?? undefined,
      }));
    if (anchor?.latitude != null && anchor.longitude != null && !items.some((b) => b.id === anchor.id)) {
      list.push({
        id: anchor.id,
        name: anchor.name,
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        markerColor: { bg: "#000000", fg: "#ffffff", border: "#000000" },
      });
    }
    return list;
  }, [items, anchor]);

  return (
    <div className="h-screen w-full">
      <PoiGoogleMap
        pois={pois}
        selectedPoiId={null}
        fitToMarkers
        mapTheme={baseColor ? "light" : "default-light"}
        baseColor={baseColor}
        onPoiClick={(id) => {
          const s = bySlug[id];
          if (!s) return;
          try {
            window.parent?.postMessage({ type: "owm-open-fiche", slug: s }, "*");
          } catch { /* noop */ }
        }}
      />
    </div>
  );
};

export default EmbedArticleMap;
