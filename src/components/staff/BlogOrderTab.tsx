import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Pin, GripVertical, ArrowUp, ArrowDown, Save, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface OrderPost {
  id: string;
  slug: string;
  title_fr: string;
  cover_image_url: string | null;
  custom_hero_image_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  is_pinned: boolean;
  sort_order: number | null;
}

const SELECT_COLS =
  "id, slug, title_fr, cover_image_url, custom_hero_image_url, created_at, updated_at, published_at, is_pinned, sort_order";

export { compareBlogOrder } from "@/lib/blogOrder";
import { compareBlogOrder } from "@/lib/blogOrder";


const SortableRow = ({
  post,
  index,
  total,
  onMove,
}: {
  post: OrderPost;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });
  const image = post.cover_image_url || post.custom_hero_image_url;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-3 p-2 rounded-lg border bg-card ${
        isDragging ? "shadow-lg opacity-90" : ""
      } ${post.is_pinned ? "ring-2 ring-destructive/60" : ""}`}
    >
      {post.is_pinned && (
        <span className="absolute -top-2 -left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md">
          <Pin className="h-3.5 w-3.5 fill-current" />
        </span>
      )}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground p-1 shrink-0"
        {...attributes}
        {...listeners}
        aria-label="Déplacer"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-6 text-center text-xs font-mono text-muted-foreground shrink-0">{index + 1}</span>

      {image ? (
        <img src={image} alt={post.title_fr} className="w-16 h-12 rounded object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-16 h-12 rounded bg-muted shrink-0 flex items-center justify-center text-[9px] text-muted-foreground">
          Pas d'image
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate flex items-center gap-1.5">
          {post.is_pinned && <Pin className="h-3 w-3 text-destructive fill-current shrink-0" />}
          {post.title_fr}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Créé {format(new Date(post.created_at), "d MMM yyyy", { locale: fr })} · Modifié{" "}
          {format(new Date(post.updated_at || post.created_at), "d MMM yyyy", { locale: fr })}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
    </div>
  );
};

interface ExtraCard {
  id: string;
  title: string;
  href: string;
  image: string | null;
  date: string | null;
  note: string;
}

const BlogOrderTab = () => {
  const [posts, setPosts] = useState<OrderPost[]>([]);
  const [extras, setExtras] = useState<ExtraCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const load = async () => {
      const [postsRes, feedsRes] = await Promise.all([
        supabase.from("blog_posts").select(SELECT_COLS).eq("is_published", true),
        supabase
          .from("video_feed_pages")
          .select("id, slug, hero_title_bottom_fr, cover_image_url, custom_hero_image_url, published_at, created_at")
          .eq("is_published", true)
          .order("published_at", { ascending: false, nullsFirst: false }),
      ]);
      const data = postsRes.data;
      if (data) {
        const list = (data as OrderPost[]).slice().sort((a, b) =>
          compareBlogOrder(
            { is_pinned: a.is_pinned, sort_order: a.sort_order, date: a.published_at || a.created_at },
            { is_pinned: b.is_pinned, sort_order: b.sort_order, date: b.published_at || b.created_at },
          ),
        );
        setPosts(list);
      }
      const feedCards: ExtraCard[] = ((feedsRes.data as any[]) ?? []).map((f) => ({
        id: `feed-${f.id}`,
        title: f.hero_title_bottom_fr || f.slug,
        href: `/videos/${f.slug}`,
        image: f.cover_image_url || f.custom_hero_image_url || null,
        date: f.published_at || f.created_at || null,
        note: "Page vidéo",
      }));
      setExtras([
        ...feedCards,
        {
          id: "static-etablissements-notes",
          title: "Établissements notés au Maroc",
          href: "/blog/etablissements-notes",
          image: ratedHeroAsset.url,
          date: null,
          note: "Page dynamique",
        },
      ]);
      setIsLoading(false);
    };
    load();
  }, []);



  const move = (from: number, to: number) => {
    setPosts((prev) => arrayMove(prev, from, to));
    setDirty(true);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = posts.findIndex((p) => p.id === active.id);
    const to = posts.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    move(from, to);
  };

  const save = async () => {
    setSaving(true);
    try {
      const total = posts.length;
      // sort_order décroissant : le 1er de la liste a la plus grande valeur
      const updates = posts.map((p, i) => ({ id: p.id, sort_order: (total - i) * 10 }));
      for (const u of updates) {
        const { error } = await supabase.from("blog_posts").update({ sort_order: u.sort_order }).eq("id", u.id);
        if (error) throw error;
      }
      setPosts((prev) => prev.map((p, i) => ({ ...p, sort_order: (total - i) * 10 })));
      setDirty(false);
      toast.success("Ordre enregistré", { description: `${total} articles réordonnés sur /blog` });
    } catch (e: any) {
      toast.error("Erreur d'enregistrement", { description: e?.message ?? String(e) });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pinnedCount = posts.filter((p) => p.is_pinned).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Ordre des articles</h2>
          <p className="text-sm text-muted-foreground">
            {posts.length} article{posts.length > 1 ? "s" : ""} publié{posts.length > 1 ? "s" : ""} — {pinnedCount}{" "}
            épinglé{pinnedCount > 1 ? "s" : ""} en tête. Glissez-déposez (ou flèches) puis enregistrez.
          </p>
        </div>
        <Button onClick={save} disabled={!dirty || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer l'ordre
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Aucun article publié.</CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {posts.map((p, i) => (
                <SortableRow key={p.id} post={p} index={i} total={posts.length} onMove={move} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default BlogOrderTab;
