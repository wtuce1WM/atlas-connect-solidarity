import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Eye, EyeOff, Layout, Languages, Check, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title_fr: string;
  title_en: string | null;
  title_ar: string | null;
  slug: string;
  excerpt_fr: string | null;
  excerpt_en: string | null;
  excerpt_ar: string | null;
  content_en: string | null;
  content_ar: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  is_published: boolean;
}

const BlogManagement = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [translating, setTranslating] = useState<Record<string, "en" | "ar" | null>>({});

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title_fr, title_en, title_ar, slug, excerpt_fr, excerpt_en, excerpt_ar, content_en, content_ar, cover_image_url, published_at, created_at, updated_at, is_published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (data) setPosts(data as BlogPost[]);
      setIsLoading(false);
    };
    fetchPosts();
  }, []);

  const handleTranslate = async (post: BlogPost, target: "en" | "ar") => {
    setTranslating((s) => ({ ...s, [post.id]: target }));
    try {
      const { data, error } = await supabase.functions.invoke("translate-blog-post", {
        body: { slug: post.slug, target },
      });
      if (error) throw error;
      toast.success(`Traduction ${target.toUpperCase()} relancée`, {
        description: post.title_fr,
      });
      // Refresh row
      const { data: refreshed } = await supabase
        .from("blog_posts")
        .select("id, title_fr, title_en, title_ar, slug, excerpt_fr, excerpt_en, excerpt_ar, content_en, content_ar, cover_image_url, published_at, created_at, updated_at, is_published")
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
          <h2 className="text-xl font-bold">Articles</h2>
          <p className="text-sm text-muted-foreground">
            {posts.length} article{posts.length > 1 ? "s" : ""} — même ordre que /blog
          </p>
        </div>
      </div>

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

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucun article trouvé.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const missingEn = !post.title_en || !post.content_en;
            const missingAr = !post.title_ar || !post.content_ar;
            const busy = translating[post.id];
            return (
              <Card key={post.id} className="overflow-hidden">
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
                        <h3 className="font-semibold text-sm">{post.title_fr}</h3>
                        <div className="font-mono text-[10px] text-muted-foreground/70">/{post.slug}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={post.is_published ? "default" : "secondary"} className="text-xs">
                          {post.is_published ? (
                            <><Eye className="h-3 w-3 mr-1" /> Publié</>
                          ) : (
                            <><EyeOff className="h-3 w-3 mr-1" /> Brouillon</>
                          )}
                        </Badge>
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
