import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, X, Loader2, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import VideoThumbnail from "@/components/VideoThumbnail";
import VideoLightbox from "@/components/staff/VideoLightbox";
import { invalidateManualCardCache } from "@/lib/manualCards";
import { cardKey, fetchHomepageCardBadges } from "@/lib/homepageCardBadges";
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
  /** Seule image de la carte : celle forcée en backoffice. */
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

      const [entriesRes, badgesRes, extraRes, orderRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order, show_in_menu").order("sort_order"),
        supabase.from("badges").select("id, name_fr").order("name_fr"),
        (supabase as any)
          .from("front_structure_homepage_extra_cards")
          .select("id, image_url, sort_order, badge_id")
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
        ...extras.map((c) => ({
          kind: "extra" as const,
          id: c.id,
          label: badgeMap.get(c.badge_id) || "Carte libre",
          imageUrl: c.image_url || null,
        })),

      ];

      const previews: CardPreview[] = targets.map((t) => {
        const assigned = assignments[cardKey(t.kind, t.id)] || [];
        const label =
          t.kind === "entry"
            ? t.label
            : assigned.map((b) => badgeMap.get(b)).filter(Boolean).join(" / ") || t.label;
        return {
          key: cardKey(t.kind, t.id),
          kind: t.kind,
          id: t.id,
          label,
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
      .upload(path, file, { cacheControl: "3600", contentType: file.type });
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

  const renderThumbBox = (it: CardPreview) => (
    <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
      {it.imageUrl ? (
        <img src={it.imageUrl} alt={it.label} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center px-2">
          Aucune image forcée
        </div>
      )}
      {it.label && (
        <div className="absolute inset-x-0 top-[10%] z-[7] flex items-center justify-center px-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black">
            {it.label}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <div className="rounded-xl border bg-card p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2 pl-6">
                      <p
                        className={`text-base font-bold uppercase tracking-wide line-clamp-1 ${
                          card.kind === "entry" ? "text-foreground" : "text-primary"
                        }`}
                      >
                        {card.label}
                      </p>
                      {card.kind === "extra" && (
                        <button
                          type="button"
                          onClick={() => deleteExtraCard(card.id)}
                          title="Supprimer cette carte"
                          className="shrink-0"
                        >
                          <X className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <div className="w-[38%] shrink-0">{renderThumbBox(card)}</div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="text-sm font-semibold">
                          Badges{" "}
                          {assigned.length > 0 && (
                            <span className="text-primary">({assigned.length} — cumul OU)</span>
                          )}
                        </div>
                        {assigned.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {assigned.map((id) => {
                              const b = allBadges.find((x) => x.id === id);
                              if (!b) return null;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => toggleBadge(card, id)}
                                  title="Retirer ce badge"
                                  className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-sm font-semibold"
                                >
                                  {b.name_fr}
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aucun badge affecté</p>
                        )}

                        <Input
                          value={badgeFilter[key] || ""}
                          onChange={(e) => setBadgeFilter((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder="Rechercher un badge…"
                          className="h-9 text-sm"
                        />
                        <div className="max-h-56 overflow-auto border rounded-md bg-background divide-y">
                          {visibleBadges.map((b) => {
                            const on = assigned.includes(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => toggleBadge(card, b.id)}
                                className={`w-full text-left px-2.5 py-2 text-sm truncate hover:bg-accent ${
                                  on ? "bg-primary/20 text-primary font-bold" : ""
                                }`}
                              >
                                {on ? "✓ " : ""}
                                {b.name_fr}
                              </button>
                            );
                          })}
                          {visibleBadges.length === 0 && (
                            <div className="px-2.5 py-2 text-sm text-muted-foreground">Aucun badge</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground shrink-0">
                        Image forcée {card.imageUrl && <span className="text-primary font-semibold">(active)</span>}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await uploadImage(card, file);
                          e.target.value = "";
                        }}
                        className="text-xs flex-1 min-w-0"
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
                          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
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
