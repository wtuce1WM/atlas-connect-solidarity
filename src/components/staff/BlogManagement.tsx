import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Calendar, User, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BlogPost {
  id: string;
  title_fr: string;
  title_en: string | null;
  title_ar: string | null;
  slug: string;
  excerpt_fr: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  is_published: boolean;
}

const BlogManagement = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title_fr, title_en, title_ar, slug, excerpt_fr, cover_image_url, author_name, published_at, created_at, is_published")
        .order("created_at", { ascending: false });
      if (data) setPosts(data);
      setIsLoading(false);
    };
    fetch();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const published = posts.filter(p => p.is_published);
  const drafts = posts.filter(p => !p.is_published);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Articles de Blog</h2>
          <p className="text-sm text-muted-foreground">
            {published.length} publiés · {drafts.length} brouillons · {posts.length} total
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucun article trouvé.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <div className="flex gap-4 p-4">
                {post.cover_image_url && (
                  <img
                    src={post.cover_image_url}
                    alt={post.title_fr}
                    className="w-24 h-16 rounded object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{post.title_fr}</h3>
                      {post.title_en && (
                        <p className="text-xs text-muted-foreground truncate">EN: {post.title_en}</p>
                      )}
                      {post.title_ar && (
                        <p className="text-xs text-muted-foreground truncate">AR: {post.title_ar}</p>
                      )}
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
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.excerpt_fr}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {post.author_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {post.author_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(post.published_at || post.created_at), "d MMM yyyy", { locale: fr })}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">/{post.slug}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
