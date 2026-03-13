import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InstagramIcon, TikTokIcon, PinterestIcon } from "@/components/staff/SocialMediaIcons";

interface SocialPost {
  id: string;
  platform: string;
  post_url: string;
  sort_order: number;
}

interface SocialPostsEditorProps {
  businessId: string;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: <InstagramIcon className="h-4 w-4" /> },
  { value: "tiktok", label: "TikTok", icon: <TikTokIcon className="h-4 w-4" /> },
  { value: "pinterest", label: "Pinterest", icon: <PinterestIcon className="h-4 w-4" /> },
];

const SocialPostsEditor = ({ businessId }: SocialPostsEditorProps) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState("instagram");
  const { toast } = useToast();

  const fetchPosts = async () => {
    setIsLoading(true);
    const { data } = await (supabase
      .from("business_social_posts" as any)
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true }) as any);
    setPosts((data || []) as SocialPost[]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (businessId) fetchPosts();
  }, [businessId]);

  const detectPlatform = (url: string): string => {
    if (/instagram\.com/i.test(url)) return "instagram";
    if (/tiktok\.com/i.test(url)) return "tiktok";
    if (/pinterest\.(com|fr|co\.uk)/i.test(url)) return "pinterest";
    return newPlatform;
  };

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    const platform = detectPlatform(newUrl);
    const maxOrder = posts.reduce((max, p) => Math.max(max, p.sort_order), -1);

    const { error } = await (supabase
      .from("business_social_posts" as any)
      .insert({
        business_id: businessId,
        platform,
        post_url: newUrl.trim(),
        sort_order: maxOrder + 1,
      }) as any);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewUrl("");
      toast({ title: "Post social ajouté" });
      fetchPosts();
    }
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("business_social_posts" as any).delete().eq("id", id) as any);
    toast({ title: "Post supprimé" });
    fetchPosts();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des posts sociaux…
      </div>
    );
  }

  return (
    <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
      <Label className="text-sm font-semibold">📱 Posts sociaux (embeds)</Label>
      <p className="text-xs text-muted-foreground">
        Ajoutez des URLs de posts Instagram, TikTok ou Pinterest. Ils seront affichés dans l'onglet "Social" de la fiche.
      </p>

      {posts.map((post) => {
        const pInfo = PLATFORMS.find(p => p.value === post.platform);
        return (
          <div key={post.id} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="shrink-0">{pInfo?.icon}</div>
            <Input value={post.post_url} readOnly className="flex-1 text-xs bg-background" />
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" onClick={() => handleDelete(post.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">URL du post</Label>
          <Input
            value={newUrl}
            onChange={(e) => {
              setNewUrl(e.target.value);
              const detected = detectPlatform(e.target.value);
              setNewPlatform(detected);
            }}
            placeholder="https://www.instagram.com/p/..."
            className="text-xs"
          />
        </div>
        <Select value={newPlatform} onValueChange={setNewPlatform}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value}>
                <div className="flex items-center gap-2">{p.icon} {p.label}</div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={handleAdd} disabled={!newUrl.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>
    </div>
  );
};

export default SocialPostsEditor;
