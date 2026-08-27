import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, X, Loader2, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import VideoThumbnail from "@/components/VideoThumbnail";
import VideoLightbox from "@/components/staff/VideoLightbox";
import { invalidateManualCardCache } from "@/lib/manualCards";
import { cardKey, deriveThumbnail, fetchHomepageCardBadges, resolveVideoByBadges } from "@/lib/homepageCardBadges";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  /** Clé de stockage unique du JSON (plus de toggle de ville sur /front). */
  city?: string;
}


interface BadgeLite {
  id: string;
  name_fr: string;
}

interface CardPreview {
  key: string;
  kind: "entry" | "extra";
  id: string;
  label: string;
  videoId: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  businessName: string | null;
  ownerLogo: string | null;
  ownerName: string | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
}

const HomepageFrontStructurePreview = ({ city = "Marrakech" }: Props) => {
  const [cards, setCards] = useState<CardPreview[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [badgesByCard, setBadgesByCard] = useState<Record<string, string[]>>({});
  const [allBadges, setAllBadges] = useState<BadgeLite[]>([]);
  const [badgeFilter, setBadgeFilter] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (isFirstLoad.current) setLoading(true);

      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .eq("name_fr", city)
        .maybeSingle();
      const cityRowId = (cityRow as any)?.id || null;

      let cityDocIds: Set<string> | null = null;
      let cityGenericIds: Set<string> | null = null;
      if (cityRowId) {
        const [{ data: docCities }, { data: genCities }] = await Promise.all([
          supabase.from("business_document_cities").select("document_id").eq("city_id", cityRowId),
          (supabase as any).from("generic_video_cities").select("generic_video_id").eq("city_id", cityRowId),
        ]);
        cityDocIds = new Set(((docCities as any[]) || []).map((r) => r.document_id));
        cityGenericIds = new Set(((genCities as any[]) || []).map((r) => r.generic_video_id));
      }

      const [entriesRes, badgesRes, extraRes, orderRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order, show_in_menu").order("sort_order"),
        supabase.from("badges").select("id, name_fr").order("name_fr"),
        (supabase as any)
          .from("front_structure_homepage_extra_cards")
          .select("id, image_url, sort_order")
          .eq("city", city)
          .order("sort_order", { ascending: true }),
        (supabase as any)
          .from("front_structure_homepage_order")
          .select("item_type, item_id, sort_order")
          .eq("city", city)
          .order("sort_order", { ascending: true }),
      ]);

      const badges: BadgeLite[] = ((badgesRes.data as any[]) || []).map((b) => ({ id: b.id, name_fr: b.name_fr }));
      const badgeMap = new Map(badges.map((b) => [b.id, b.name_fr]));
      const assignments = await fetchHomepageCardBadges(city);

      const entries = ((entriesRes.data as any[]) || []).filter((e) => e.show_in_menu !== false);
      const extras = ((extraRes as any).data as any[]) || [];

      const overridesRes = await (supabase as any)
        .from("front_structure_homepage_overrides")
        .select("front_structure_id, image_url")
        .eq("city", city);
      const entryImageById: Record<string, string | null> = {};
      (((overridesRes as any).data as any[]) || []).forEach((o) => {
        if (o.image_url) entryImageById[o.front_structure_id] = o.image_url;
      });

      const targets: Array<{ kind: "entry" | "extra"; id: string; label: string; imageUrl: string | null }> = [
        ...entries.map((e) => ({ kind: "entry" as const, id: e.id, label: e.name, imageUrl: entryImageById[e.id] || null })),
        ...extras.map((c) => ({ kind: "extra" as const, id: c.id, label: "Carte libre", imageUrl: c.image_url || null })),
      ];

      const docs = await Promise.all(
        targets.map((t) =>
          resolveVideoByBadges(assignments[cardKey(t.kind, t.id)] || [], cityDocIds, cityGenericIds),
        ),
      );

      const bizIds = new Set<string>();
      docs.forEach((d) => {
        if (!d) return;
        if (d.business_id) bizIds.add(d.business_id);
        const disp = d.poi_id || d.linked_business_id || d.business_id;
        if (disp) bizIds.add(disp);
      });
      const bizMap = new Map<string, any>();
      const bizArr = [...bizIds];
      for (let i = 0; i < bizArr.length; i += 300) {
        const { data } = await supabase
          .from("businesses")
          .select("id, name, logo_url, computed_rating, rating, total_review_count")
          .in("id", bizArr.slice(i, i + 300));
        (data || []).forEach((b: any) => bizMap.set(b.id, b));
      }

      const previews: CardPreview[] = targets.map((t, idx) => {
        const doc = docs[idx];
        const assigned = assignments[cardKey(t.kind, t.id)] || [];
        const label =
          t.kind === "entry"
            ? t.label
            : assigned.map((b) => badgeMap.get(b)).filter(Boolean).join(" + ") || "Carte libre";
        if (!doc) {
          return {
            key: cardKey(t.kind, t.id),
            kind: t.kind,
            id: t.id,
            label,
            videoId: null,
            videoUrl: null,
            thumbnail: t.imageUrl,
            businessName: null,
            ownerLogo: null,
            ownerName: null,
            rating: null,
            reviewCount: null,
            imageUrl: t.imageUrl,
          };
        }
        const dispId = doc.poi_id || doc.linked_business_id || doc.business_id;
        const dispBiz = dispId ? bizMap.get(dispId) || null : null;
        const ownerBiz = doc.business_id ? bizMap.get(doc.business_id) || null : null;
        return {
          key: cardKey(t.kind, t.id),
          kind: t.kind,
          id: t.id,
          label,
          videoId: doc.id,
          videoUrl: doc.url,
          thumbnail: t.imageUrl || doc.thumbnail_url || deriveThumbnail(doc.url),
          businessName: dispBiz?.name || null,
          ownerLogo: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.logo_url : null,
          ownerName: ownerBiz && ownerBiz.id !== dispId ? ownerBiz.name : null,
          rating: dispBiz?.computed_rating ?? dispBiz?.rating ?? null,
          reviewCount: dispBiz?.total_review_count ?? null,
          imageUrl: t.imageUrl,
        };
      });

      const orderMap = new Map<string, number>();
      (((orderRes as any).data as any[]) || []).forEach((r) => {
        orderMap.set(`${r.item_type}:${r.item_id}`, r.sort_order);
      });
      const ordered = previews.filter((p) => orderMap.has(p.key)).sort((a, b) => orderMap.get(a.key)! - orderMap.get(b.key)!);
      const rest = previews.filter((p) => !orderMap.has(p.key));

      if (!cancelled) {
        setCards([...ordered, ...rest]);
        setOrder([...ordered, ...rest].map((p) => p.key));
        setAllBadges(badges);
        setBadgesByCard(assignments);
        setLoading(false);
        isFirstLoad.current = false;
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [city, reloadKey]);

  const toggleBadge = async (card: CardPreview, badgeId: string) => {
    const key = card.key;
    const current = badgesByCard[key] || [];
    const isOn = current.includes(badgeId);
    if (isOn) {
      const { error } = await (supabase as any)
        .from("front_structure_homepage_card_badges")
        .delete()
        .eq("city", city)
        .eq("item_type", card.kind)
        .eq("item_id", card.id)
        .eq("badge_id", badgeId);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await (supabase as any)
        .from("front_structure_homepage_card_badges")
        .insert({ city, item_type: card.kind, item_id: card.id, badge_id: badgeId, sort_order: current.length });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
    }
    const next = isOn ? current.filter((b) => b !== badgeId) : [...current, badgeId];

    // Keep the legacy single-badge column in sync for free cards (used by the /front overlay).
    if (card.kind === "extra") {
      await (supabase as any)
        .from("front_structure_homepage_extra_cards")
        .update({ badge_id: next[0] || null })
        .eq("id", card.id);
    }

    invalidateManualCardCache(city as any);
    setBadgesByCard((p) => ({ ...p, [key]: next }));
    setReloadKey((k) => k + 1);
  };

  const setEntryImage = async (entryId: string, imageUrl: string | null) => {
    if (imageUrl) {
      const { error } = await (supabase as any)
        .from("front_structure_homepage_overrides")
        .upsert({ front_structure_id: entryId, city, business_id: null, image_url: imageUrl }, { onConflict: "front_structure_id,city" });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await (supabase as any)
        .from("front_structure_homepage_overrides")
        .delete()
        .eq("front_structure_id", entryId)
        .eq("city", city);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
    }
    invalidateManualCardCache(city as any);
    setReloadKey((k) => k + 1);
  };

  const setExtraImage = async (cardId: string, imageUrl: string | null) => {
    const { error } = await (supabase as any)
      .from("front_structure_homepage_extra_cards")
      .update({ image_url: imageUrl })
      .eq("id", cardId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    invalidateManualCardCache(city as any);
    setReloadKey((k) => k + 1);
  };

  const uploadImage = async (card: CardPreview, file: File) => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const folder = card.kind === "entry" ? "homepage-entries" : "homepage-extra-cards";
    const path = `${folder}/${card.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("sponsor-assets")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
    if (upErr) {
      toast({ title: "Upload échoué", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: pub } = supabase.storage.from("sponsor-assets").getPublicUrl(path);
    if (card.kind === "entry") await setEntryImage(card.id, pub.publicUrl);
    else await setExtraImage(card.id, pub.publicUrl);
  };

  const addExtraCard = async () => {
    const { error } = await (supabase as any)
      .from("front_structure_homepage_extra_cards")
      .insert({ city, business_id: null, badge_id: null, sort_order: cards.length + 1 });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    invalidateManualCardCache(city as any);
    setReloadKey((k) => k + 1);
  };

  const deleteExtraCard = async (cardId: string) => {
    await (supabase as any)
      .from("front_structure_homepage_card_badges")
      .delete()
      .eq("city", city)
      .eq("item_type", "extra")
      .eq("item_id", cardId);
    const { error } = await (supabase as any)
      .from("front_structure_homepage_extra_cards")
      .delete()
      .eq("id", cardId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    invalidateManualCardCache(city as any);
    setReloadKey((k) => k + 1);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistOrder = async (newOrder: string[]) => {
    const rows = newOrder.map((key, idx) => {
      const [item_type, item_id] = key.split(":");
      return { city, item_type, item_id, sort_order: idx };
    });
    const { error: delErr } = await (supabase as any)
      .from("front_structure_homepage_order")
      .delete()
      .eq("city", city);
    if (delErr) {
      toast({ title: "Erreur", description: delErr.message, variant: "destructive" });
      return;
    }
    if (rows.length > 0) {
      const { error: insErr } = await (supabase as any).from("front_structure_homepage_order").insert(rows);
      if (insErr) {
        toast({ title: "Erreur", description: insErr.message, variant: "destructive" });
        return;
      }
    }
    invalidateManualCardCache(city as any);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    void persistOrder(next);
  };

  const cardsByKey = useMemo(() => new Map(cards.map((c) => [c.key, c])), [cards]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderThumbBox = (it: CardPreview) => {
    const isFileVideo = !!it.videoUrl && !it.thumbnail && !/youtube|youtu\.be|vimeo|mediadelivery/i.test(it.videoUrl);
    return it.videoId ? (
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
        {it.thumbnail ? (
          <img src={it.thumbnail} alt={it.businessName || ""} className="w-full h-full object-cover" loading="lazy" />
        ) : isFileVideo && it.videoUrl ? (
          <VideoThumbnail src={it.videoUrl} alt={it.businessName || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
        {it.label && (
          <div className="absolute inset-x-0 top-[10%] z-[7] flex items-center justify-center px-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black">
              {it.label}
            </span>
          </div>
        )}
        {it.rating != null && (
          <div className="absolute top-1.5 left-1.5 right-1.5 z-[5] flex items-center gap-1 text-[10px]">
            <Star className="h-2.5 w-2.5 text-gold fill-gold" />
            <span className="font-medium text-white">{it.rating}/20</span>
            {(it.reviewCount ?? 0) > 0 && <span className="text-white/70">· {it.reviewCount} avis</span>}
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (it.videoUrl) setLightboxUrl(it.videoUrl);
          }}
          disabled={!it.videoUrl}
          className="absolute inset-0 flex items-center justify-center group/play disabled:cursor-not-allowed"
          aria-label="Lire la vidéo"
        >
          <div className="w-8 h-8 rounded-full bg-black/50 group-hover/play:bg-black/70 transition-colors flex items-center justify-center">
            <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
          </div>
        </button>
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
        {it.thumbnail ? (
          <img src={it.thumbnail} alt="" className="w-full h-full object-cover rounded-lg" />
        ) : (
          "Affecter un ou plusieurs badges"
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {order.map((key) => {
              const card = cardsByKey.get(key);
              if (!card) return null;
              const assigned = badgesByCard[key] || [];
              const filter = (badgeFilter[key] || "").trim().toLowerCase();
              const visibleBadges = filter
                ? allBadges.filter((b) => b.name_fr.toLowerCase().includes(filter))
                : allBadges;
              return (
                <SortableCell key={key} id={key}>
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wider line-clamp-1 ${
                        card.kind === "entry" ? "text-muted-foreground" : "text-primary"
                      }`}
                    >
                      {card.label}
                    </p>
                    {card.kind === "extra" && (
                      <button type="button" onClick={() => deleteExtraCard(card.id)} title="Supprimer cette carte">
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                  {renderThumbBox(card)}
                  <div>
                    <label className="text-[9px] text-muted-foreground">
                      Badges {assigned.length > 0 && <span className="text-primary">({assigned.length} — ET)</span>}
                    </label>
                    <Input
                      value={badgeFilter[key] || ""}
                      onChange={(e) => setBadgeFilter((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder="Filtrer les badges…"
                      className="h-5 px-1 text-[9px] mb-1"
                    />
                    <div className="max-h-32 overflow-auto border rounded-md bg-background divide-y">
                      {visibleBadges.map((b) => {
                        const on = assigned.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => toggleBadge(card, b.id)}
                            className={`w-full text-left px-1.5 py-0.5 text-[9px] truncate hover:bg-accent ${
                              on ? "bg-primary/15 text-primary font-semibold" : ""
                            }`}
                          >
                            {on ? "✓ " : ""}
                            {b.name_fr}
                          </button>
                        );
                      })}
                      {visibleBadges.length === 0 && (
                        <div className="px-1.5 py-1 text-[9px] text-muted-foreground">Aucun badge</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">
                      Image forcée {card.imageUrl && <span className="text-primary">(prioritaire)</span>}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await uploadImage(card, file);
                          e.target.value = "";
                        }}
                        className="h-5 text-[9px] flex-1"
                      />
                      {card.imageUrl && (
                        <button
                          type="button"
                          className="shrink-0"
                          onClick={() =>
                            card.kind === "entry" ? setEntryImage(card.id, null) : setExtraImage(card.id, null)
                          }
                          title="Retirer l'image"
                        >
                          <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                </SortableCell>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex justify-center">
        <Button size="sm" variant="outline" onClick={addExtraCard}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une carte
        </Button>
      </div>
      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

const SortableCell = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative space-y-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute -top-1 -left-1 z-30 h-6 w-6 rounded-md bg-background/90 border shadow flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-accent"
        title="Déplacer"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
};

export default HomepageFrontStructurePreview;
