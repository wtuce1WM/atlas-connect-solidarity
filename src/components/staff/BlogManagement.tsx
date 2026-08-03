import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Eye, EyeOff, Layout, Languages, Check, AlertTriangle, Pin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title_fr: string;
  title_en: string | null;
  title_ar: string | null;
  slug: string;
  template: string | null;
  excerpt_fr: string | null;
  excerpt_en: string | null;
  excerpt_ar: string | null;
  content_en: string | null;
  content_ar: string | null;
  intro_en: string | null;
  intro_ar: string | null;
  entries_en: unknown[] | null;
  entries_ar: unknown[] | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  is_pinned: boolean;
  city_scope?: string | null;
  anchor_kind?: string | null;
}

const CITY_OPTIONS: { label: string; value: string | null }[] = [
  { label: "Tout le Maroc", value: null },
  { label: "Marrakech", value: "Marrakech" },
  { label: "Essaouira", value: "Essaouira" },
];

const SELECT_COLS =
  "id, title_fr, title_en, title_ar, slug, template, excerpt_fr, excerpt_en, excerpt_ar, content_en, content_ar, intro_en, intro_ar, entries_en, entries_ar, cover_image_url, published_at, created_at, updated_at, is_published, is_pinned, city_scope, anchor_kind";


/** Un article est traduit si le titre existe ET qu'il y a du contenu dans la langue,
 *  quel que soit le support : entries (template article), intro, ou content (legacy HTML). */
const hasTranslation = (
  title: string | null,
  content: string | null,
  intro: string | null,
  entries: unknown[] | null,
) => {
  if (!title || !title.trim()) return false;
  if (Array.isArray(entries) && entries.length > 0) return true;
  if (intro && intro.trim()) return true;
  if (content && content.trim()) return true;
  return false;
};


interface BlogManagementProps {
  /** "standard" = articles sans anchor_business_id (par défaut). "owner" = articles avec anchor_business_id. */
  mode?: "standard" | "owner";
  /** Filtrer sur un établissement précis (mode owner). */
  anchorBusinessId?: string;
  /** Filtrer sur le type de rattachement (mode owner). */
  anchorKind?: "owner" | "generic";
  /** Permet de basculer un article entre propriétaire et générique. */
  allowKindSwitch?: boolean;
  /** Callback après changement de type. */
  onKindChange?: () => void;
  /** Titre/description personnalisés. */
  title?: string;
  subtitle?: string;
  showInternalLinks?: boolean;
}

const BlogManagement = ({
  mode = "standard",
  anchorBusinessId,
  anchorKind,
  allowKindSwitch = false,
  onKindChange,
  title,
  subtitle,
  showInternalLinks = true,
}: BlogManagementProps = {}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [translating, setTranslating] = useState<Record<string, "en" | "ar" | null>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPosts = async () => {
      let q = supabase
        .from("blog_posts")
        .select(SELECT_COLS)
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (anchorBusinessId) {
        q = q.eq("anchor_business_id", anchorBusinessId);
        if (anchorKind) q = q.eq("anchor_kind", anchorKind);
      } else if (mode === "owner") {
        q = q.not("anchor_business_id", "is", null);
      } else {
        q = q.is("anchor_business_id", null);
      }
      const { data } = await q;
      if (data) setPosts(data as BlogPost[]);
      setIsLoading(false);
    };
    fetchPosts();
  }, [mode, anchorBusinessId, anchorKind]);

  const handleTranslate = async (post: BlogPost, target: "en" | "ar") => {
    setTranslating((s) => ({ ...s, [post.id]: target }));
    try {
      const { error } = await supabase.functions.invoke("translate-blog-post", {
        body: { slug: post.slug, target },
      });
      if (error) throw error;
      toast.success(`Traduction ${target.toUpperCase()} relancée`, { description: post.title_fr });
      const { data: refreshed } = await supabase
        .from("blog_posts")
        .select(SELECT_COLS)
        .eq("id", post.id)
        .single();
      if (refreshed) {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? (refreshed as BlogPost) : p)));
      }
    } catch (e: any) {
      toast.error("Erreur de traduction", { description: e?.message ?? String(e) });
    } finally {
      setTranslating((s) => ({ ...s, [post.id]: null }));
    }
  };

  const updatePost = async (post: BlogPost, patch: Partial<Pick<BlogPost, "is_published" | "is_pinned" | "anchor_kind" | "city_scope">>) => {
    setUpdating((s) => ({ ...s, [post.id]: true }));
    // Optimistic
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...patch } : p)));
    try {
      const payload: any = { ...patch };
      if (patch.is_published === true && !post.published_at) {
        payload.published_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("blog_posts")
        .update(payload)
        .eq("id", post.id)
        .select(SELECT_COLS)
        .single();
      if (error) throw error;
      if (data) {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? (data as BlogPost) : p)));
      }
      if (patch.is_published !== undefined) {
        toast.success(patch.is_published ? "Article publié" : "Article dépublié", { description: post.title_fr });
      }
      if (patch.is_pinned !== undefined) {
        toast.success(patch.is_pinned ? "Article épinglé" : "Épingle retirée", { description: post.title_fr });
      }
      if (patch.anchor_kind !== undefined) {
        toast.success(
          patch.anchor_kind === "owner" ? "Marqué article propriétaire" : "Marqué article générique",
          { description: post.title_fr },
        );
        onKindChange?.();
      }
    } catch (e: any) {
      // Revert
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      toast.error("Erreur de mise à jour", { description: e?.message ?? String(e) });
    } finally {
      setUpdating((s) => ({ ...s, [post.id]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{title ?? "Articles"}</h2>
          <p className="text-sm text-muted-foreground">
            {subtitle ?? (
              <>
                {posts.length} article{posts.length > 1 ? "s" : ""} — épinglés en tête, puis même ordre que /blog
              </>
            )}
          </p>
        </div>
      </div>

      {showInternalLinks && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Pages internes</h3>
            <div className="flex flex-wrap gap-2">
              <Link to="/staff/carousel-nav-demo">
                <Button variant="outline" size="sm" className="gap-2">
                  <Layout className="h-3.5 w-3.5" />
                  Démo Navigation Carrousel
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucun article trouvé.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const missingEn = !hasTranslation(post.title_en, post.content_en, post.intro_en, post.entries_en);
            const missingAr = !hasTranslation(post.title_ar, post.content_ar, post.intro_ar, post.entries_ar);

            const busy = translating[post.id];
            const isUpdating = !!updating[post.id];
            return (
              <Card key={post.id} className={`overflow-hidden ${post.is_pinned ? "ring-1 ring-primary/40" : ""}`}>
                <div className="flex gap-4 p-4">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title_fr}
                      className="w-28 h-28 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded shrink-0 bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                      Pas d'OG
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                          {post.title_fr}
                        </h3>
                        <div className="font-mono text-[10px] text-muted-foreground/70">/{post.slug}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`pub-${post.id}`}
                            checked={post.is_published}
                            disabled={isUpdating}
                            onCheckedChange={(v) => updatePost(post, { is_published: v })}
                          />
                          <Label htmlFor={`pub-${post.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                            {post.is_published ? (
                              <><Eye className="h-3 w-3" /> Publié</>
                            ) : (
                              <><EyeOff className="h-3 w-3" /> Brouillon</>
                            )}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`pin-${post.id}`}
                            checked={post.is_pinned}
                            disabled={isUpdating}
                            onCheckedChange={(v) => updatePost(post, { is_pinned: !!v })}
                          />
                          <Label htmlFor={`pin-${post.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                            <Pin className="h-3 w-3" /> Pin
                          </Label>
                        </div>
                        {allowKindSwitch && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            disabled={isUpdating}
                            onClick={() =>
                              updatePost(post, {
                                anchor_kind: post.anchor_kind === "owner" ? "generic" : "owner",
                              })
                            }
                          >
                            {post.anchor_kind === "owner" ? "→ Générique" : "→ Propriétaire"}
                          </Button>
                        )}
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </div>
                    </div>

                    {post.excerpt_fr && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">Meta description :</span>{" "}
                        <span className="line-clamp-2">{post.excerpt_fr}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        <span className="text-foreground/70">Créé :</span>{" "}
                        {format(new Date(post.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                      <span>
                        <span className="text-foreground/70">Modifié :</span>{" "}
                        {format(new Date(post.updated_at || post.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                      {post.published_at && (
                        <span>
                          <span className="text-foreground/70">Publié :</span>{" "}
                          {format(new Date(post.published_at), "d MMM yyyy", { locale: fr })}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge
                        variant={missingEn ? "destructive" : "outline"}
                        className="text-[10px] gap-1"
                      >
                        {missingEn ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        EN {missingEn ? "manquant" : "OK"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1"
                        disabled={busy === "en"}
                        onClick={() => handleTranslate(post, "en")}
                      >
                        {busy === "en" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Languages className="h-3 w-3" />
                        )}
                        Retraduire EN
                      </Button>

                      <Badge
                        variant={missingAr ? "destructive" : "outline"}
                        className="text-[10px] gap-1"
                      >
                        {missingAr ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        AR {missingAr ? "manquant" : "OK"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1"
                        disabled={busy === "ar"}
                        onClick={() => handleTranslate(post, "ar")}
                      >
                        {busy === "ar" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Languages className="h-3 w-3" />
                        )}
                        Retraduire AR
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
