import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Props {
  city: string;
}

interface FSEntry {
  id: string;
  name: string;
  subcategory_ids: string[];
}

interface PreviewItem {
  entryId: string;
  entryName: string;
  videoId: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  businessName: string | null;
  ownerLogo: string | null;
  ownerName: string | null;
  rating: number | null;
  reviewCount: number | null;
  overrideBusinessId: string | null;
  isOverride: boolean;
}

interface BizLite { id: string; name: string }

function deriveThumbnail(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

const HomepageFrontStructurePreview = ({ city }: Props) => {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allBusinesses, setAllBusinesses] = useState<BizLite[]>([]);
  const [searchByEntry, setSearchByEntry] = useState<Record<string, string>>({});
  const [openSearchEntry, setOpenSearchEntry] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpenSearchEntry(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);

      // City row id
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .eq("name_fr", city)
        .maybeSingle();
      const cityRowId = (cityRow as any)?.id || null;

      let extraDocIds = new Set<string>();
      if (cityRowId) {
        const { data } = await supabase
          .from("business_document_cities")
          .select("document_id")
          .eq("city_id", cityRowId);
        extraDocIds = new Set(((data as any[]) || []).map((r) => r.document_id));
      }

      // FS entries
      const [entriesRes, linksRes, overridesRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order, show_in_menu").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        (supabase as any)
          .from("front_structure_homepage_overrides")
          .select("front_structure_id, business_id")
          .eq("city", city),
      ]);

      const linksByEntry: Record<string, string[]> = {};
      (linksRes.data || []).forEach((l: any) => {
        (linksByEntry[l.front_structure_id] ||= []).push(l.subcategory_id);
      });

      const overrideByEntry: Record<string, string> = {};
      ((overridesRes as any).data || []).forEach((o: any) => {
        overrideByEntry[o.front_structure_id] = o.business_id;
      });

      const entries: FSEntry[] = (entriesRes.data || [])
        .filter((e: any) => e.show_in_menu !== false)
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          subcategory_ids: linksByEntry[e.id] || [],
        }))
        .filter((e: FSEntry) => e.subcategory_ids.length > 0);

      // Per entry: pick first video (own city or multi-city)
      const firstDocByEntry: Record<string, any> = {};
      const allBizIds = new Set<string>();

      for (const entry of entries) {
        const overrideBizId = overrideByEntry[entry.id];
        let candidate: any = null;

        if (overrideBizId) {
          // Pick first video (in matching subcategories) belonging to this business, regardless of city
          const { data: ovDocs } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
            .eq("type", "video")
            .or(`business_id.eq.${overrideBizId},linked_business_id.eq.${overrideBizId},poi_id.eq.${overrideBizId}`)
            .in("subcategory_id", entry.subcategory_ids)
            .order("sort_order", { ascending: true })
            .limit(1);
          candidate = (ovDocs && ovDocs[0]) || null;

          if (!candidate) {
            // fallback: any video for this business
            const { data: anyDocs } = await supabase
              .from("business_documents")
              .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
              .eq("type", "video")
              .or(`business_id.eq.${overrideBizId},linked_business_id.eq.${overrideBizId},poi_id.eq.${overrideBizId}`)
              .order("sort_order", { ascending: true })
              .limit(1);
            candidate = (anyDocs && anyDocs[0]) || null;
          }
          allBizIds.add(overrideBizId);
        } else {
          const { data: ownDocs } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
            .eq("type", "video")
            .eq("city", city)
            .in("subcategory_id", entry.subcategory_ids)
            .order("sort_order", { ascending: true })
            .limit(1);

          candidate = (ownDocs && ownDocs[0]) || null;

          if (extraDocIds.size > 0) {
            const ids = [...extraDocIds];
            for (let i = 0; i < ids.length; i += 300) {
              const chunk = ids.slice(i, i + 300);
              const { data: extras } = await supabase
                .from("business_documents")
                .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
                .eq("type", "video")
                .in("subcategory_id", entry.subcategory_ids)
                .in("id", chunk)
                .order("sort_order", { ascending: true })
                .limit(1);
              const e = (extras && extras[0]) || null;
              if (e && (!candidate || (e.sort_order ?? 0) < (candidate.sort_order ?? 0))) {
                candidate = e;
              }
            }
          }
        }

        if (candidate) {
          firstDocByEntry[entry.id] = candidate;
          const dispId = candidate.poi_id || candidate.linked_business_id || candidate.business_id;
          if (dispId) allBizIds.add(dispId);
          if (candidate.business_id) allBizIds.add(candidate.business_id);
        }
      }

      // Fetch businesses for display
      const bizMap = new Map<string, any>();
      const bizIdsArr = [...allBizIds];
      for (let i = 0; i < bizIdsArr.length; i += 300) {
        const chunk = bizIdsArr.slice(i, i + 300);
        const { data } = await supabase
          .from("businesses")
          .select("id, name, logo_url, computed_rating, rating, total_review_count, is_poi")
          .in("id", chunk);
        (data || []).forEach((b: any) => bizMap.set(b.id, b));
      }

      const previews: PreviewItem[] = entries.map((entry) => {
        const doc = firstDocByEntry[entry.id];
        const overrideBusinessId = overrideByEntry[entry.id] || null;
        if (!doc) {
          return {
            entryId: entry.id,
            entryName: entry.name,
            videoId: null,
            videoUrl: null,
            thumbnail: null,
            businessName: overrideBusinessId ? (bizMap.get(overrideBusinessId)?.name || null) : null,
            ownerLogo: null,
            ownerName: null,
            rating: null,
            reviewCount: null,
            overrideBusinessId,
            isOverride: !!overrideBusinessId,
          };
        }
        const ownerBiz = bizMap.get(doc.business_id) || null;
        const dispId = (() => {
          if (overrideBusinessId) return overrideBusinessId;
          if (ownerBiz?.is_poi) return doc.business_id;
          if (doc.poi_id) return doc.poi_id;
          if (doc.linked_business_id && bizMap.get(doc.linked_business_id)?.is_poi) return doc.linked_business_id;
          return doc.linked_business_id || doc.business_id;
        })();
        const dispBiz = bizMap.get(dispId) || null;

        return {
          entryId: entry.id,
          entryName: entry.name,
          videoId: doc.id,
          videoUrl: doc.url,
          thumbnail: doc.thumbnail_url || deriveThumbnail(doc.url),
          businessName: dispBiz?.name || null,
          ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
          ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
          rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
          reviewCount: dispBiz?.total_review_count ?? null,
          overrideBusinessId,
          isOverride: !!overrideBusinessId,
        };
      });

      if (!cancelled) {
        setItems(previews);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [city, reloadKey]);

  // Server-side search per query (debounced)
  const [searchResults, setSearchResults] = useState<Record<string, BizLite[]>>({});
  useEffect(() => {
    if (!openSearchEntry) return;
    const q = (searchByEntry[openSearchEntry] || "").trim();
    const entryId = openSearchEntry;
    const handle = setTimeout(async () => {
      let query = supabase.from("businesses").select("id, name").eq("is_active", true).order("name").limit(50);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query;
      const rows = ((data as any[]) || []).map((b) => ({ id: b.id, name: b.name }));
      setSearchResults((p) => ({ ...p, [entryId]: rows }));
      // Merge into allBusinesses so override label resolution works
      setAllBusinesses((prev) => {
        const map = new Map(prev.map((b) => [b.id, b]));
        rows.forEach((b) => map.set(b.id, b));
        return [...map.values()];
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [openSearchEntry, searchByEntry]);

  const setOverride = async (entryId: string, businessId: string | null) => {
    if (businessId) {
      const { error } = await (supabase as any)
        .from("front_structure_homepage_overrides")
        .upsert(
          { front_structure_id: entryId, city, business_id: businessId },
          { onConflict: "front_structure_id,city" }
        );
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await (supabase as any)
        .from("front_structure_homepage_overrides")
        .delete()
        .eq("front_structure_id", entryId)
        .eq("city", city);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    }
    setOpenSearchEntry(null);
    setSearchByEntry((p) => ({ ...p, [entryId]: "" }));
    setReloadKey((k) => k + 1);
  };

  const filteredFor = useMemo(() => {
    return (entryId: string) => {
      const q = (searchByEntry[entryId] || "").trim().toLowerCase();
      if (!q) return allBusinesses.slice(0, 50);
      return allBusinesses.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 50);
    };
  }, [searchByEntry, allBusinesses]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-lg">
        Aucune entrée Structure du Front visible.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((it) => (
        <div key={it.entryId} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1">
            {it.entryName}
          </p>
          {it.videoId ? (
            <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
              {it.thumbnail ? (
                <img src={it.thumbnail} alt={it.businessName || it.entryName} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
              {it.rating != null && (
                <div className="absolute top-1.5 left-1.5 right-1.5 z-[5] flex items-center gap-1 text-[10px]">
                  <Star className="h-2.5 w-2.5 text-gold fill-gold" />
                  <span className="font-medium text-white">{it.rating}/20</span>
                  {(it.reviewCount ?? 0) > 0 && (
                    <span className="text-white/70">· {it.reviewCount} avis</span>
                  )}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
                </div>
              </div>
              {it.ownerLogo && (
                <div className="absolute inset-x-0 bottom-[15%] z-[6] flex items-center justify-center px-2 pointer-events-none">
                  <img
                    src={it.ownerLogo}
                    alt={it.ownerName || ""}
                    className="max-w-[100px] max-h-[72px] object-contain"
                    style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))" }}
                  />
                </div>
              )}
              {it.businessName && (
                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <p className="text-[10px] font-medium text-white line-clamp-1">{it.businessName}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[9/16] rounded-lg bg-muted flex items-center justify-center text-[10px] text-muted-foreground text-center px-2">
              Aucune vidéo
            </div>
          )}

          {/* Champ Établissement override */}
          <div className="relative">
            <label className="text-[9px] text-muted-foreground">
              Établissement {it.isOverride && <span className="text-primary">(forcé)</span>}
            </label>
            {it.overrideBusinessId ? (
              <div className="flex items-center gap-0.5 h-5 px-1 border rounded-md bg-background">
                <span className="text-[9px] truncate flex-1">
                  {allBusinesses.find((b) => b.id === it.overrideBusinessId)?.name || it.businessName || "…"}
                </span>
                <button
                  type="button"
                  className="shrink-0"
                  onClick={() => setOverride(it.entryId, null)}
                  title="Retirer l'override"
                >
                  <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ) : (
              <>
                <Input
                  value={searchByEntry[it.entryId] || ""}
                  onChange={(e) => setSearchByEntry((p) => ({ ...p, [it.entryId]: e.target.value }))}
                  onFocus={() => setOpenSearchEntry(it.entryId)}
                  placeholder="Rechercher…"
                  className="h-5 px-1 text-[9px]"
                />
                {openSearchEntry === it.entryId && (
                  <div className="absolute z-20 left-0 right-0 mt-0.5 max-h-48 overflow-auto border rounded-md bg-popover shadow-md">
                    {filteredFor(it.entryId).length === 0 ? (
                      <div className="px-1.5 py-1 text-[9px] text-muted-foreground">Aucun résultat</div>
                    ) : (
                      filteredFor(it.entryId).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full text-left px-1.5 py-0.5 text-[9px] hover:bg-accent truncate"
                          onClick={() => setOverride(it.entryId, b.id)}
                        >
                          {b.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default HomepageFrontStructurePreview;
