import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { InstagramIcon, TikTokIcon, PinterestIcon } from "@/components/staff/SocialMediaIcons";

interface SocialPost {
  id: string;
  platform: string;
  post_url: string;
  sort_order: number;
}

interface SocialEmbedsTabProps {
  businessId: string;
  /** Called when post count is known */
  onPostCount?: (count: number) => void;
}

/** Detect platform from URL */
function detectPlatform(url: string): "instagram" | "tiktok" | "pinterest" | null {
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/pinterest\.(com|fr|co\.uk)/i.test(url)) return "pinterest";
  return null;
}

const platformIcon = (p: string) => {
  switch (p) {
    case "instagram": return <InstagramIcon className="h-4 w-4" />;
    case "tiktok": return <TikTokIcon className="h-4 w-4" />;
    case "pinterest": return <PinterestIcon className="h-4 w-4" />;
    default: return null;
  }
};

const platformLabel = (p: string) => {
  switch (p) {
    case "instagram": return "Instagram";
    case "tiktok": return "TikTok";
    case "pinterest": return "Pinterest";
    default: return p;
  }
};

/** Load external embed script if not already present */
function loadEmbedScript(src: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
}

function InstagramEmbed({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEmbedScript("https://www.instagram.com/embed.js", "ig-embed-js").then(() => {
      if ((window as any).instgrm?.Embeds) {
        (window as any).instgrm.Embeds.process(ref.current);
      }
    });
  }, [url]);

  return (
    <div ref={ref} className="max-w-[540px] mx-auto">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ width: "100%", margin: 0 }}
      />
    </div>
  );
}

function TikTokEmbed({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Extract video ID from URL
  const videoId = url.match(/video\/(\d+)/)?.[1] || "";

  useEffect(() => {
    loadEmbedScript("https://www.tiktok.com/embed.js", "tt-embed-js").then(() => {
      // TikTok embed.js processes blockquotes automatically
    });
  }, [url]);

  return (
    <div ref={ref} className="max-w-[325px] mx-auto">
      <blockquote
        className="tiktok-embed"
        cite={url}
        data-video-id={videoId}
        style={{ maxWidth: 325 }}
      >
        <section />
      </blockquote>
    </div>
  );
}

function PinterestEmbed({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEmbedScript("https://assets.pinterest.com/js/pinit.js", "pin-embed-js").then(() => {
      if ((window as any).PinUtils) {
        (window as any).PinUtils.build(ref.current);
      }
    });
  }, [url]);

  return (
    <div ref={ref} className="flex justify-center">
      <a data-pin-do="embedPin" href={url} />
    </div>
  );
}

function SocialPostEmbed({ post }: { post: SocialPost }) {
  const platform = post.platform || detectPlatform(post.post_url);

  switch (platform) {
    case "instagram":
      return <InstagramEmbed url={post.post_url} />;
    case "tiktok":
      return <TikTokEmbed url={post.post_url} />;
    case "pinterest":
      return <PinterestEmbed url={post.post_url} />;
    default:
      return (
        <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
          {post.post_url}
        </a>
      );
  }
}

const SocialEmbedsTab = ({ businessId, onPostCount }: SocialEmbedsTabProps) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("business_social_posts" as any)
        .select("id, platform, post_url, sort_order")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true }) as any;

      const items = (data || []) as SocialPost[];
      setPosts(items);
      onPostCount?.(items.length);
      setIsLoading(false);
    };
    fetch();
  }, [businessId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) return null;

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {platformIcon(post.platform)}
            <span className="font-medium">{platformLabel(post.platform)}</span>
          </div>
          <SocialPostEmbed post={post} />
        </div>
      ))}
    </div>
  );
};

export default SocialEmbedsTab;
